import type { Brand, Conversation } from "./types";

export const initialBrands: Brand[] = [
  {
    id: "bloom-body",
    name: "Bloom Body Co.",
    tone: "Warm, reassuring, concise",
    policies: [
      {
        id: "bb-return",
        type: "Return policy",
        title: "Damaged items and returns",
        body:
          "Damaged items must be reported within 7 days of delivery with a photo of the product and packaging. Eligible damaged items can be replaced or refunded after verification."
      },
      {
        id: "bb-refund",
        type: "Refund policy",
        title: "Refund window",
        body:
          "Refunds are available within 7 days of delivery for damaged, incorrect, or unopened products. Refunds are processed to the original payment method within 5-7 business days."
      },
      {
        id: "bb-shipping",
        type: "Shipping policy",
        title: "Shipping timelines",
        body:
          "Standard shipping takes 3-5 business days. Replacement shipments for verified damaged items are dispatched within 2 business days."
      },
      {
        id: "bb-cancel",
        type: "Cancellation policy",
        title: "Order cancellation",
        body: "Orders can be cancelled within 2 hours of placement if they have not been packed or dispatched."
      }
    ]
  },
  {
    id: "urban-nutri",
    name: "Urban Nutri Labs",
    tone: "Clear, practical, slightly formal",
    policies: [
      {
        id: "un-return",
        type: "Return policy",
        title: "Returns for supplements",
        body:
          "Returns are accepted within 15 days of delivery only for sealed products. Damaged products must be reported within 48 hours with photos and batch details."
      },
      {
        id: "un-refund",
        type: "Refund policy",
        title: "Refund eligibility",
        body:
          "Refunds are issued only after warehouse inspection. Opened supplements are not refundable unless damage or leakage is verified within 48 hours of delivery."
      }
    ]
  }
];

export const initialConversations: Conversation[] = [
  {
    id: "conv-1001",
    customerName: "Aarav Mehta",
    brandId: "bloom-body",
    order: {
      orderId: "BB-10482",
      item: "Hydrating Rose Body Oil - 200ml",
      deliveredAt: "2026-09-07",
      status: "Delivered",
      value: "Rs. 1,299"
    },
    messages: [
      {
        id: "m1",
        sender: "customer",
        text: "My order was delivered but the bottle is broken. What can I do?",
        timestamp: "2026-09-08T10:07:00.000Z"
      }
    ]
  },
  {
    id: "conv-1002",
    customerName: "Neha Rao",
    brandId: "urban-nutri",
    order: {
      orderId: "UN-77120",
      item: "Daily Greens Supplement",
      deliveredAt: "2026-08-18",
      status: "Delivered",
      value: "Rs. 2,199"
    },
    messages: [
      {
        id: "m4",
        sender: "customer",
        text: "I received this 20 days ago. Can I get a refund?",
        timestamp: "2026-09-08T12:45:00.000Z"
      }
    ]
  }
];
