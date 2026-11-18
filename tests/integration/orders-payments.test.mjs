// Integration of the order and payment APIs against a real database: idempotency and payment failure.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { api, createOrder, newKey, pickAvailableDrink, registerCustomer } from '../helpers.mjs';

test('FR-07: gửi lại cùng Idempotency-Key trả lại đúng đơn cũ với 200', async () => {
  const { token } = await registerCustomer();
  const drink = await pickAvailableDrink();
  const key = newKey();
  const body = { items: [{ productId: drink.id, size: 'S', qty: 1 }] };

  const first = await api('POST', '/orders', { token, idempotencyKey: key, body });
  const second = await api('POST', '/orders', { token, idempotencyKey: key, body });

  assert.equal(first.status, 201);
  assert.equal(second.status, 200);
  assert.equal(second.headers.get('idempotency-replayed'), 'true');
  assert.equal(second.body.id, first.body.id);

  const history = await api('GET', '/orders/me', { token });
  assert.equal(history.body.total, 1, 'only one order was created');
});

test('FR-07: cùng Idempotency-Key nhưng nội dung khác trả 422', async () => {
  const { token } = await registerCustomer();
  const drink = await pickAvailableDrink();
  const key = newKey();

  const first = await api('POST', '/orders', {
    token,
    idempotencyKey: key,
    body: { items: [{ productId: drink.id, size: 'S', qty: 1 }] },
  });
  const changed = await api('POST', '/orders', {
    token,
    idempotencyKey: key,
    body: { items: [{ productId: drink.id, size: 'S', qty: 2 }] },
  });

  assert.equal(first.status, 201);
  assert.equal(changed.status, 422);
});

test('FR-08: thẻ bị từ chối chuyển PAYMENT_FAILED, thử lại bằng Ví thành công', async () => {
  const { token } = await registerCustomer();
  const order = await createOrder(token, await pickAvailableDrink());

  const declined = await api('POST', '/payments', {
    token,
    idempotencyKey: newKey(),
    body: { orderId: order.id, method: 'CARD', cardNumber: '4111111111110000' },
  });
  assert.equal(declined.status, 402);
  assert.equal(declined.body.order.status, 'PAYMENT_FAILED');

  const retry = await api('POST', '/payments', {
    token,
    idempotencyKey: newKey(),
    body: { orderId: order.id, method: 'WALLET' },
  });
  assert.equal(retry.status, 201);
  assert.equal(retry.body.order.status, 'PAID');
});

test('FR-08: thanh toán lần hai cho đơn đã PAID trả 409', async () => {
  const { token } = await registerCustomer();
  const order = await createOrder(token, await pickAvailableDrink());
  const pay = () =>
    api('POST', '/payments', { token, idempotencyKey: newKey(), body: { orderId: order.id, method: 'WALLET' } });

  assert.equal((await pay()).status, 201);
  assert.equal((await pay()).status, 409);
});

test('FR-09: khách không xem được đơn của người khác (404)', async () => {
  const owner = await registerCustomer();
  const other = await registerCustomer();
  const order = await createOrder(owner.token, await pickAvailableDrink());

  const res = await api('GET', `/orders/${order.id}`, { token: other.token });
  assert.equal(res.status, 404);
});

test('health: GET /health trả status ok', async () => {
  const res = await api('GET', '/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
});
