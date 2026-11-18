import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source=name=>readFileSync(new URL(name,import.meta.url),'utf8');
test('every routing condition uses the dropdown, with no catering-only gate or text-value fallback',()=>{
 const text=source('BindingConditions.jsx');assert.match(text,/fields\.map\(key=><RoutingConditionPicker/);assert.match(text,/optionsAction="mapping_condition_options"/);assert.doesNotMatch(text,/<Input\b|catering\?/);assert.match(text,/payment_method:'Payment method'/);assert.match(text,/payment_type:'Payment type'/);
});
test('original routing and journal-line keys use the shared dropdown',()=>{
 for(const name of ['BindingEditor.jsx','MappingLineAccount.jsx'])assert.match(source(name),/<MappingKeyPicker/);
 assert.match(source('MappingFields.jsx'),/<BindingConditions companyId=\{company.id\}/);
});