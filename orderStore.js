// Сховище замовлень у пам'яті процесу. Нічого не знає про HTTP та Express.
// Дані зникають після перезапуску сервера (це вимога завдання).

const orders = [];

function add(order) {
  orders.push(order);
  return order;
}

function list() {
  return orders;
}

function findById(id) {
  return orders.find((order) => order.id === id);
}

// Повертає true, якщо замовлення було знайдено й видалено.
function removeById(id) {
  const index = orders.findIndex((order) => order.id === id);
  if (index === -1) return false;
  orders.splice(index, 1);
  return true;
}

module.exports = { add, list, findById, removeById };
