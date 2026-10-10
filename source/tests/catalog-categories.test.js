import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCategoryController,parseFeatured} from '../services/catalog-service/src/modules/categories/category.controller.js';
import {listCategories} from '../services/catalog-service/src/modules/categories/category.service.js';

test('category seed contains five unique active featured computer categories', () => {
  const categories = JSON.parse(readFileSync(new URL('../services/catalog-service/src/seeds/categories.json', import.meta.url), 'utf8'));
  assert.equal(categories.length, 5);
  assert.equal(new Set(categories.map(category => category.slug)).size, 5);
  assert.ok(categories.every(category => category.isActive && category.isFeatured));
  assert.deepEqual(categories.map(category => category.slug).sort(), ['ban-phim','chuot','laptop','man-hinh','ssd-luu-tru']);
});

test('featured query accepts only true or false', () => {
  assert.equal(parseFeatured(undefined), undefined);
  assert.equal(parseFeatured('true'), true);
  assert.equal(parseFeatured('false'), false);
  assert.throws(() => parseFeatured('yes'), error => error.status === 400 && error.code === 'VALIDATION_ERROR');
});

test('category listing filters active records and projects public fields', async () => {
  const observed = {};
  const rows = [{name:'Laptop',slug:'laptop'}];
  const query = {
    select(value) { observed.select = value; return this; },
    sort(value) { observed.sort = value; return this; },
    async lean() { return rows; }
  };
  const Category = {find(filter) { observed.filter = filter; return query; }};
  assert.equal(await listCategories(Category, {featured:true}), rows);
  assert.deepEqual(observed.filter, {isActive:true,isFeatured:true});
  assert.equal(observed.select, 'name slug description imageUrl isFeatured');
  assert.deepEqual(observed.sort, {name:1});
});

test('category controller rejects unsupported query parameters', async () => {
  const controller = createCategoryController({Category:{}});
  let receivedError;
  await controller.list({query:{sort:'name'}}, {}, error => { receivedError = error; });
  assert.equal(receivedError.status, 400);
  assert.equal(receivedError.code, 'VALIDATION_ERROR');
});
