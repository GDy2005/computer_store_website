import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

import {VIETNAM_DEMO_ADDRESSES} from '@store/validation';

const administrativeUnits = JSON.parse(readFileSync(new URL(
  '../frontend/src/features/address/data/administrativeUnits.json',
  import.meta.url
), 'utf8'));

const provinceByCode = new Map(
  administrativeUnits.provinces.map(province => [
    province.code,
    province
  ])
);
const wardByCode = new Map(
  administrativeUnits.wards.map(ward => [ward.code, ward])
);

test('shared demo addresses match the storefront administrative dataset', () => {
  for (const address of Object.values(VIETNAM_DEMO_ADDRESSES)) {
    const province = provinceByCode.get(address.provinceCode);
    const ward = wardByCode.get(address.wardCode);

    assert.ok(province, `Unknown province code ${address.provinceCode}`);
    assert.ok(ward, `Unknown ward code ${address.wardCode}`);
    assert.equal(province.name, address.province);
    assert.equal(ward.name, address.ward);
    assert.equal(ward.provinceCode, address.provinceCode);
    assert.equal(Object.hasOwn(address, 'district'), false);
  }
});
