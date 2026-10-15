import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCategoryController} from '../services/catalog-service/src/controllers/category.controller.js';
import {createCategoryService} from '../services/catalog-service/src/services/category.service.js';
import {parseFeatured,validateCategoryList} from '../services/catalog-service/src/validations/category.validation.js';

test('category seed contains five unique active featured computer categories', () => {
  const categories = JSON.parse(readFileSync(new URL('../services/catalog-service/src/seeds/data/categories.json', import.meta.url), 'utf8'));
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
  const service = createCategoryService({Category});
  assert.equal(await service.list({featured:true}), rows);
  assert.deepEqual(observed.filter, {isActive:true,isFeatured:true});
  assert.equal(observed.select, 'name slug description imageUrl isFeatured');
  assert.deepEqual(observed.sort, {name:1});
});

test('category controller rejects unsupported query parameters', async () => {
  let receivedError;
  validateCategoryList(
    {query:{sort:'name'}},
    {},
    error => { receivedError = error; }
  );
  assert.equal(receivedError.status, 400);
  assert.equal(receivedError.code, 'VALIDATION_ERROR');
});

test('category controller delegates validated input to service', async () => {
  let receivedQuery;
  const controller = createCategoryController({
    categoryService: {
      async list(query) {
        receivedQuery = query;
        return [];
      }
    }
  });
  let receivedError;
  let payload;
  await controller.list(
    {validatedQuery:{featured:true}},
    {json(value) { payload = value; }},
    error => { receivedError = error; }
  );
  assert.equal(receivedError, undefined);
  assert.deepEqual(receivedQuery, {featured:true});
  assert.deepEqual(payload, {success:true,data:{items:[]}});
});
