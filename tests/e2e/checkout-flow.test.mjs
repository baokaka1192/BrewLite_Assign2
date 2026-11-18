// End-to-end flow of UC-01 over HTTP: menu -> product detail -> quote -> order -> payment -> confirmation.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { WEB_URL, api, newKey, pickAvailableDrink, registerCustomer } from '../helpers.mjs';

test('UC-01: khách xem menu, đặt đơn, thanh toán Ví và thấy đơn PAID trong lịch sử', async () => {
  // FR-01: menu is public.
  const drink = await pickAvailableDrink();

  // FR-02: product detail with size and topping options.
  const detail = await api('GET', `/products/${drink.id}`);
  assert.equal(detail.status, 200);
  const topping = detail.body.toppings[0];
  const sizeM = detail.body.sizes.find((s) => s.code === 'M');
  assert.ok(topping && sizeM, 'drink exposes size M and at least one topping');

  // FR-04: register, then the session is valid.
  const { token, user } = await registerCustomer();
  const me = await api('GET', '/auth/me', { token });
  assert.equal(me.status, 200);
  assert.equal(me.body.id, user.id);

  const items = [{ productId: drink.id, size: 'M', toppingIds: [topping.id], qty: 1 }];
  const expectedTotal = drink.price + sizeM.delta + topping.price;

  // FR-05: quote matches the server price and writes nothing.
  const quote = await api('POST', '/orders/quote', { token, body: { items } });
  assert.equal(quote.status, 200);
  assert.equal(quote.body.total, expectedTotal);

  // FR-06: the order is created PENDING with the server-computed total.
  const order = await api('POST', '/orders', { token, idempotencyKey: newKey(), body: { items } });
  assert.equal(order.status, 201);
  assert.equal(order.body.status, 'PENDING');
  assert.equal(order.body.total, expectedTotal);

  // FR-08: wallet payment succeeds.
  const payment = await api('POST', '/payments', {
    token,
    idempotencyKey: newKey(),
    body: { orderId: order.body.id, method: 'WALLET' },
  });
  assert.equal(payment.status, 201);
  assert.deepEqual(payment.body.order, { id: order.body.id, status: 'PAID' });

  // FR-09: confirmation and history show the paid order.
  const confirmed = await api('GET', `/orders/${order.body.id}`, { token });
  assert.equal(confirmed.status, 200);
  assert.equal(confirmed.body.status, 'PAID');

  const history = await api('GET', '/orders/me', { token });
  assert.equal(history.status, 200);
  assert.ok(history.body.items.some((o) => o.id === order.body.id && o.status === 'PAID'));
});

test('UC-01 luồng ngoại lệ: chưa đăng nhập thì không tạo được đơn (401)', async () => {
  const drink = await pickAvailableDrink();
  const res = await api('POST', '/orders', {
    idempotencyKey: newKey(),
    body: { items: [{ productId: drink.id, size: 'S', qty: 1 }] },
  });
  assert.equal(res.status, 401);
});

test('web: trang menu và trang xác nhận đơn phản hồi 200', { skip: !WEB_URL && 'đặt WEB_URL để kiểm tra web' }, async () => {
  for (const path of ['/menu', '/orders']) {
    const res = await fetch(`${WEB_URL}${path}`);
    assert.equal(res.status, 200, `${path} should answer 200`);
  }
});
