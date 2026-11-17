export const ORDER_STATUSES = ["awaiting_payment", "pending", "accepted", "preparing", "on_the_way", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

const RESTAURANT_MOVES: Record<OrderStatus, OrderStatus[]> = {
    awaiting_payment: [],
    pending: ["accepted", "cancelled"],
    accepted: ["preparing", "cancelled"],
    preparing: ["on_the_way"],
    on_the_way: ["delivered"],
    delivered: [],
    cancelled: [],
};

export function canRestaurantMove(from: OrderStatus, to: OrderStatus) {
    return RESTAURANT_MOVES[from]?.includes(to) ?? false;
}

export const USER_CANCELLABLE: OrderStatus[] = ["awaiting_payment", "pending"];

export const STATUS_LABELS: Record<OrderStatus, string> = {
    awaiting_payment: "waiting for your payment",
    pending: "waiting for the restaurant",
    accepted: "accepted by the restaurant",
    preparing: "being prepared",
    on_the_way: "on the way",
    delivered: "delivered",
    cancelled: "cancelled",
};

export const ACTORS = ["user", "restaurant", "admin", "payment", "system"] as const;
export type Actor = (typeof ACTORS)[number];
