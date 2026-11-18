import moment from "moment";
import WebhookUrlField from "./WebhookUrlField";
import SecretsChecklist from "./SecretsChecklist";
import SetupSteps from "./SetupSteps";

export default function ConnectionSetup({ meta, record, savedSecrets }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3 space-y-3">
      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-700">{meta.method}</p>
        <WebhookUrlField url={meta.webhookUrl} />
        {meta.verifyToken && (
          <p className="text-xs text-slate-500">Verify token: the phrase you saved as META_VERIFY_TOKEN.</p>
        )}
      </div>
      <SecretsChecklist names={meta.secrets} saved={savedSecrets} />
      {record?.last_check_message && (
        <p className="text-xs text-slate-600">Last check: {record.last_check_message}</p>
      )}
      {record?.last_lead_date && (
        <p className="text-xs text-slate-500">Last lead received {moment(record.last_lead_date).fromNow()}</p>
      )}
      <SetupSteps steps={meta.steps} />
    </div>
  );
}