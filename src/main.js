/**
 * Функция для расчета прибыли
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase) {
  return purchase.items.reduce((total, item) => {
    const discount = item.discount || 0; // Если скидки нет, используем 0
    const itemRevenue = item.sale_price * item.quantity * (1 - discount / 100);
    return total + itemRevenue;
  }, 0);
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
  const profit = seller.profit || 0;

  if (index === 0) return parseFloat((profit * 0.15).toFixed(2)); // 1 место: 15%
  if (index <= 2) return parseFloat((profit * 0.1).toFixed(2)); // 2-3 места: 10%
  if (index === total - 1) return 0; // Последний: 0%
  return parseFloat((profit * 0.05).toFixed(2)); // Остальные: 5%
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
  // ... предыдущие проверки ...

  if (data.sellers.length === 0) {
    throw new Error("Массив продавцов не должен быть пустым");
  }
  if (data.products.length === 0) {
    throw new Error("Массив товаров не должен быть пустым");
  }
  if (data.purchase_records.length === 0) {
    throw new Error("Массив записей о покупках не должен быть пустым");
  }

  const sellerIndex = Object.fromEntries(data.sellers.map((s) => [s.id, s]));
  const productIndex = Object.fromEntries(data.products.map((p) => [p.sku, p]));

  const sellerStats = data.sellers.map((seller) => ({
    id: seller.id,
    name: `${seller.first_name} ${seller.last_name}`,
    revenue: 0,
    profit: 0,
    sales_count: 0,
    products_sold: {},
  }));

  data.purchase_records.forEach((record) => {
    const seller = sellerStats.find((s) => s.id === record.seller_id);
    if (!seller) return;

    seller.sales_count += 1;

    record.items.forEach((item) => {
      const product = productIndex[item.sku];
      if (!product) return;

      const revenue = options.calculateRevenue(
        {
          ...record,
          items: [item], 
        },
        product
      );

      const cost = product.purchase_price * item.quantity;
      const profit = revenue - cost;

      seller.revenue = parseFloat((seller.revenue + revenue).toFixed(2));
      seller.profit += profit;

      seller.products_sold[item.sku] =
        (seller.products_sold[item.sku] || 0) + item.quantity;
    });
  });

  sellerStats.sort((a, b) => b.profit - a.profit);

  return sellerStats.map((seller, index) => {

    const topProducts = Object.entries(seller.products_sold)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([sku, quantity]) => ({ sku, quantity }));

    return {
      seller_id: seller.id,
      name: seller.name,
      revenue: parseFloat(seller.revenue.toFixed(2)),
      profit: parseFloat(seller.profit.toFixed(2)),
      sales_count: seller.sales_count,
      top_products: topProducts,
      bonus: options.calculateBonus(index, sellerStats.length, {
        ...sellerIndex[seller.id],
        profit: seller.profit,
      }),
    };
  });
}
