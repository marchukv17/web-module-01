// Бізнес-логіка замовлень: валідація, розрахунок total, створення id.
// Не залежить від Express (req/res) — лише від сховища.

const { randomUUID } = require("node:crypto");
const store = require("../store/orderStore");

const DEFAULT_ORDER_STATUS = "created";

// Помилка валідації вхідних даних. Маршрут перетворює її на HTTP 400.
class ValidationError extends Error {
  constructor(details) {
    super("Invalid order");
    this.name = "ValidationError";
    this.details = details;
  }
}

function makeOrderId() {
  return `ord-${randomUUID().slice(0, 8)}`;
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calculateTotal(items) {
  return roundMoney(
    items.reduce((sum, item) => sum + item.quantity * item.price, 0),
  );
}

function isPositiveNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

// Повертає масив повідомлень про помилки (порожній, якщо дані коректні).
function validateCreateOrder(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return ["Request body must be a JSON object"];
  }

  const problems = [];

  if (!isNonEmptyString(body.customerName)) {
    problems.push("customerName is required");
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    problems.push("At least one item is required");
    return problems;
  }

  body.items.forEach((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      problems.push(`items[${index}] must be an object`);
      return;
    }

    if (!isNonEmptyString(item.name)) {
      problems.push(`items[${index}].name is required`);
    }
    if (!isPositiveNumber(item.quantity)) {
      problems.push(`items[${index}].quantity must be greater than zero`);
    }
    if (!isPositiveNumber(item.price)) {
      problems.push(`items[${index}].price must be greater than zero`);
    }
  });

  return problems;
}

// id, status і total визначає сервер; решту полів клієнта ігноруємо.
function createOrder(body) {
  const problems = validateCreateOrder(body);
  if (problems.length > 0) {
    throw new ValidationError(problems);
  }

  const items = body.items.map((item) => ({
    name: item.name.trim(),
    quantity: item.quantity,
    price: item.price,
  }));

  return store.add({
    id: makeOrderId(),
    customerName: body.customerName.trim(),
    items,
    total: calculateTotal(items),
    status: DEFAULT_ORDER_STATUS,
  });
}

function listOrders() {
  return store.list();
}

// Повертає замовлення або undefined.
function getOrder(id) {
  return store.findById(id);
}

// Повертає true, якщо замовлення існувало й було видалене.
function deleteOrder(id) {
  return store.removeById(id);
}

module.exports = {
  ValidationError,
  validateCreateOrder,
  calculateTotal,
  createOrder,
  listOrders,
  getOrder,
  deleteOrder,
};
