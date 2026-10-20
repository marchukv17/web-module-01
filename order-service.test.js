// Модульні тести бізнес-логіки. Не потребують HTTP-сервера та Express.
const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const service = require("../src/services/orderService");

describe("validateCreateOrder", () => {
  test("accepts a valid order", () => {
    const problems = service.validateCreateOrder({
      customerName: "Alex",
      items: [{ name: "Keyboard", quantity: 1, price: 120 }],
    });
    assert.deepEqual(problems, []);
  });

  test("rejects a non-object body", () => {
    for (const body of [undefined, null, [], "text", 5]) {
      assert.deepEqual(service.validateCreateOrder(body), [
        "Request body must be a JSON object",
      ]);
    }
  });

  test("reports missing customer and missing items", () => {
    assert.deepEqual(
      service.validateCreateOrder({ customerName: "  ", items: [] }),
      ["customerName is required", "At least one item is required"],
    );
  });

  test("reports every invalid item field with its index", () => {
    const problems = service.validateCreateOrder({
      customerName: "Alex",
      items: [
        { name: "", quantity: 0, price: -1 },
        null,
        { name: "ok", quantity: "2", price: Infinity },
      ],
    });
    assert.deepEqual(problems, [
      "items[0].name is required",
      "items[0].quantity must be greater than zero",
      "items[0].price must be greater than zero",
      "items[1] must be an object",
      "items[2].quantity must be greater than zero",
      "items[2].price must be greater than zero",
    ]);
  });
});

describe("calculateTotal", () => {
  test("sums quantity * price and rounds to cents", () => {
    assert.equal(
      service.calculateTotal([
        { quantity: 1, price: 120 },
        { quantity: 2, price: 7.25 },
      ]),
      134.5,
    );
    assert.equal(service.calculateTotal([{ quantity: 3, price: 0.1 }]), 0.3);
    assert.equal(service.calculateTotal([{ quantity: 1, price: 1.005 }]), 1.01);
  });
});

describe("order lifecycle", () => {
  test("create ignores client total/status, trims strings, then get/delete", () => {
    const order = service.createOrder({
      customerName: "  Alex  ",
      total: 1,
      status: "paid",
      items: [{ name: " Cable ", quantity: 2, price: 7.25, extra: true }],
    });

    assert.match(order.id, /^ord-[0-9a-f]{8}$/);
    assert.equal(order.customerName, "Alex");
    assert.equal(order.status, "created");
    assert.equal(order.total, 14.5);
    assert.deepEqual(order.items, [{ name: "Cable", quantity: 2, price: 7.25 }]);

    assert.equal(service.getOrder(order.id), order);
    assert.ok(service.listOrders().includes(order));

    assert.equal(service.deleteOrder(order.id), true);
    assert.equal(service.getOrder(order.id), undefined);
    assert.equal(service.deleteOrder(order.id), false);
  });

  test("create throws ValidationError with details and stores nothing", () => {
    const before = service.listOrders().length;
    assert.throws(
      () => service.createOrder({ customerName: "", items: [] }),
      (error) =>
        error instanceof service.ValidationError && error.details.length === 2,
    );
    assert.equal(service.listOrders().length, before);
  });
});
