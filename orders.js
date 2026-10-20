// HTTP-шар: розбір запиту, вибір статус-коду, формат відповіді.
// Бізнес-правила живуть у services/orderService.js.

const express = require("express");
const orderService = require("../services/orderService");

const router = express.Router();

function errorBody(code, message, details) {
  const error = { code, message };
  if (details !== undefined) error.details = details;
  return { error };
}

const orderNotFound = () => errorBody("ORDER_NOT_FOUND", "Order not found");

// Публічне представлення замовлення (внутрішні поля назовні не віддаємо).
function toResponse(order) {
  return {
    id: order.id,
    customerName: order.customerName,
    items: order.items.map(({ name, quantity, price }) => ({
      name,
      quantity,
      price,
    })),
    total: order.total,
    status: order.status,
  };
}

router.post("/", (req, res, next) => {
  try {
    const order = orderService.createOrder(req.body);
    res.status(201).location(`/orders/${order.id}`).json(toResponse(order));
  } catch (error) {
    if (error instanceof orderService.ValidationError) {
      return res
        .status(400)
        .json(errorBody("VALIDATION_ERROR", "Invalid order", error.details));
    }
    next(error);
  }
});

router.get("/", (req, res) => {
  const orders = orderService.listOrders().map(toResponse);
  res.status(200).json({ orders, count: orders.length });
});

router.get("/:id", (req, res) => {
  const order = orderService.getOrder(req.params.id);
  if (!order) return res.status(404).json(orderNotFound());
  res.status(200).json(toResponse(order));
});

router.delete("/:id", (req, res) => {
  if (!orderService.deleteOrder(req.params.id)) {
    return res.status(404).json(orderNotFound());
  }
  res.status(204).send();
});

module.exports = { router, errorBody };
