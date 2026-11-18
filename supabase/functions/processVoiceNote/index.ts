import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { checkPermission } from '../_shared/requirePermission.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { voice_order_id, audio_url } = body;

    if (!voice_order_id || !audio_url) {
      return Response.json({ error: 'voice_order_id and audio_url are required' }, { status: 400 });
    }

    // Only the person who recorded the note (or POS / voice-order staff) may process it,
    // and only with the audio saved on that voice order.
    const voiceOrder = await base44.asServiceRole.entities.VoiceOrder.get(voice_order_id).catch(() => null);
    if (!voiceOrder) return Response.json({ error: 'Voice order not found' }, { status: 404 });
    if (voiceOrder.created_by_id !== user.id && user.role !== 'admin') {
      const { allowed } = await checkPermission(base44, user, ['cashier_edit', 'pos_view']);
      if (!allowed) return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (voiceOrder.audio_url !== audio_url) {
      return Response.json({ error: 'Audio does not match this voice order' }, { status: 400 });
    }

    // Mark as processing
    await base44.asServiceRole.entities.VoiceOrder.update(voice_order_id, {
      status: 'processing'
    });

    // Step 1: Transcribe the audio using Whisper
    const transcriptResult = await base44.asServiceRole.integrations.Core.TranscribeAudio({
      audio_url: audio_url
    });

    const rawTranscript = typeof transcriptResult === 'string'
      ? transcriptResult
      : (transcriptResult?.text || transcriptResult?.transcript || JSON.stringify(transcriptResult));

    if (!rawTranscript || rawTranscript.trim().length === 0) {
      await base44.asServiceRole.entities.VoiceOrder.update(voice_order_id, {
        status: 'flagged',
        transcript: '',
        summary: 'No speech detected in the audio recording.',
        confidence: 'low',
        confidence_reason: 'Transcription returned empty text — audio may be silent or unclear.'
      });
      return Response.json({
        success: false,
        message: 'No speech detected in audio'
      });
    }

    // Step 2: Fetch full menu items grouped by category for richer LLM context
    const menuItems = await base44.asServiceRole.entities.MenuItem.list('-name', 500);

    // Build a category → [item names] map — helps the LLM narrow phonetic matching
    const categoryMap = {};
    for (const item of menuItems) {
      if (!item.name || !item.available) continue;
      const cat = item.category?.trim() || 'أخرى';
      if (!categoryMap[cat]) categoryMap[cat] = [];
      categoryMap[cat].push(item.name);
    }

    // Format as structured text: Category: item1, item2, ...
    const menuContext = Object.entries(categoryMap)
      .map(([cat, names]) => `${cat}: ${names.join('، ')}`)
      .join('\n');

    // Step 3: Analyze with LLM — phonetic reconstruction + order extraction
    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: "claude-sonnet-5",
      prompt: `You are the world's best Arabic speech reconstruction expert, specializing in Egyptian colloquial Arabic (العامية المصرية) and restaurant voice ordering.

A customer called a restaurant and left a voice note. Below is the RAW automatic transcription produced by a speech-to-text engine (Whisper). Whisper is very poor at Egyptian Arabic — it frequently:
- Mishears words and writes phonetically similar but WRONG Arabic words (e.g., "قبل الشوزة" instead of "كبد وطرشي", "بيكل" instead of "بيبسي")
- Splits or merges words incorrectly
- Confuses similar-sounding consonants (ذ/ز, ث/س, ح/ه, ق/أ, ص/س, ض/ظ)
- Drops or adds "ال" prefix
- Mishears numbers (ستة، سبعة، اتنين، تلاتة)

=== RAW TRANSCRIPTION (UNRELIABLE) ===
"${rawTranscript}"

=== RESTAURANT MENU (grouped by category) ===
${menuContext}

=== YOUR TASK ===
You must work in TWO phases:

**PHASE 1 — Phonetic Reconstruction (corrected_transcript):**
Reconstruct what the customer ACTUALLY said, as if you were a native Egyptian listening to the same audio. Use these principles:
- Treat the raw transcript as a phonetic approximation, NOT literal text.
- Use the menu items list as an anchor: if the customer likely ordered a menu item, find the phonetically closest match and write its correct name.
- Reconstruct numbers, quantities, and common Egyptian food-ordering phrases (كام قطعة، صاج، عيش، مع لحم، زيادة، من غير...).
- Write the reconstructed sentence in clean, natural Egyptian Arabic — the way the customer would have said it if they were typing.
- If you genuinely cannot reconstruct a portion, keep your best guess and mark uncertainty in confidence_reason.

**PHASE 2 — Order Extraction (summary):**
From your reconstructed sentence, extract a clear order summary:
- List each item using the EXACT menu item name from the list above (if matched).
- Include quantities (e.g., "2x اسم المنتج").
- Include sizes, modifications, and special requests (e.g., "من غير بصل"، "زيادة جبنة").
- If something doesn't match any menu item, include it as-is and note "(غير موجود في المنيو)".

**Confidence levels:**
- "high": Multiple items clearly matched to menu, quantities explicit, reconstruction is confident.
- "medium": Some items matched but quantities/modifiers are inferred or ambiguous.
- "low": Very little could be reliably reconstructed; customer may need to be called back.

=== RULES ===
- Respond in Arabic (Egyptian if the customer spoke Egyptian).
- The corrected_transcript must be a natural, readable reconstruction — NOT the raw text.
- The summary must use exact menu item names from the list when matched.`,
      response_json_schema: {
        type: "object",
        "properties": {
          "corrected_transcript": {
            "type": "string",
            "description": "Reconstructed version of the customer's voice note in clean Egyptian Arabic — fixes phonetic errors and misheard words using menu context"
          },
          "summary": {
            "type": "string",
            "description": "Clear order summary using exact menu item names, quantities, sizes, and modifications"
          },
          "confidence": {
            "type": "string",
            "enum": ["high", "medium", "low"],
            "description": "Confidence level in the reconstruction and order interpretation"
          },
          "confidence_reason": {
            "type": "string",
            "description": "Why this confidence level was assigned — mention which items were confidently matched vs guessed"
          }
        },
        "required": ["corrected_transcript", "summary", "confidence", "confidence_reason"]
      }
    });

    // Step 4: Update the VoiceOrder with results
    await base44.asServiceRole.entities.VoiceOrder.update(voice_order_id, {
      status: 'pending',
      transcript: rawTranscript,
      corrected_transcript: llmResponse.corrected_transcript,
      summary: llmResponse.summary,
      confidence: llmResponse.confidence,
      confidence_reason: llmResponse.confidence_reason
    });

    return Response.json({
      success: true,
      transcript: rawTranscript,
      corrected_transcript: llmResponse.corrected_transcript,
      summary: llmResponse.summary,
      confidence: llmResponse.confidence,
      confidence_reason: llmResponse.confidence_reason
    });

  } catch (error) {
    console.error('processVoiceNote error:', error);

    try {
      const body = await req.clone().json();
      if (body.voice_order_id) {
        const base44 = createClientFromRequest(req);
        await base44.asServiceRole.entities.VoiceOrder.update(body.voice_order_id, {
          status: 'flagged',
          summary: 'Processing failed — staff should listen to the audio manually.',
          confidence: 'low',
          confidence_reason: `System error during processing: ${error.message}`
        });
      }
    } catch (e) {
      // ignore secondary error
    }

    return Response.json({ error: error.message }, { status: 500 });
  }
});
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const res = await handler(req);
    const newHeaders = new Headers(res.headers);
    for (const [k, v] of Object.entries(corsHeaders)) {
      newHeaders.set(k, v);
    }
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: newHeaders,
    });
  } catch (err: any) {
    return Response.json({ error: err.message || String(err) }, {
      status: 500,
      headers: corsHeaders,
    });
  }
});
