insert into brands (id, name, tone)
values
  ('11111111-1111-1111-1111-111111111111', 'Bloom Body Co.', 'Warm, reassuring, concise'),
  ('22222222-2222-2222-2222-222222222222', 'Urban Nutri Labs', 'Clear, practical, slightly formal')
on conflict (id) do nothing;

insert into customers (id, brand_id, name, phone, email)
values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'Aarav Mehta',
    '+919000000001',
    'aarav@example.com'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '22222222-2222-2222-2222-222222222222',
    'Neha Rao',
    '+919000000002',
    'neha@example.com'
  )
on conflict (id) do nothing;

insert into orders (
  id,
  brand_id,
  customer_id,
  external_order_id,
  item_name,
  status,
  delivered_at,
  order_value
)
values
  (
    'c1111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'BB-10482',
    'Hydrating Rose Body Oil - 200ml',
    'Delivered',
    '2026-09-07',
    1299.00
  ),
  (
    'c2222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'UN-77120',
    'Daily Greens Supplement',
    'Delivered',
    '2026-08-18',
    2199.00
  )
on conflict (brand_id, external_order_id) do nothing;

insert into conversations (id, brand_id, customer_id, order_id, channel, status)
values
  (
    'd1111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'c1111111-1111-1111-1111-111111111111',
    'internal',
    'open'
  ),
  (
    'd2222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'c2222222-2222-2222-2222-222222222222',
    'internal',
    'open'
  )
on conflict (id) do nothing;

insert into messages (id, brand_id, conversation_id, sender, body, created_at)
values
  (
    'e1111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'd1111111-1111-1111-1111-111111111111',
    'customer',
    'My order was delivered but the bottle is broken. What can I do?',
    '2026-09-08T06:07:00.000Z'
  ),
  (
    'e2222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    'd2222222-2222-2222-2222-222222222222',
    'customer',
    'I received this 20 days ago. Can I get a refund?',
    '2026-09-08T06:45:00.000Z'
  )
on conflict (id) do nothing;

insert into knowledge_base_entries (id, brand_id, type, title, body)
values
  (
    'f1111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'Return policy',
    'Damaged items and returns',
    'Damaged items must be reported within 7 days of delivery with a photo of the product and packaging. Eligible damaged items can be replaced or refunded after verification.'
  ),
  (
    'f1111111-1111-1111-1111-111111111112',
    '11111111-1111-1111-1111-111111111111',
    'Refund policy',
    'Refund window',
    'Refunds are available within 7 days of delivery for damaged, incorrect, or unopened products. Refunds are processed to the original payment method within 5-7 business days.'
  ),
  (
    'f1111111-1111-1111-1111-111111111113',
    '11111111-1111-1111-1111-111111111111',
    'Shipping policy',
    'Shipping timelines',
    'Standard shipping takes 3-5 business days. Replacement shipments for verified damaged items are dispatched within 2 business days.'
  ),
  (
    'f1111111-1111-1111-1111-111111111114',
    '11111111-1111-1111-1111-111111111111',
    'Cancellation policy',
    'Order cancellation',
    'Orders can be cancelled within 2 hours of placement if they have not been packed or dispatched.'
  ),
  (
    'f2222222-2222-2222-2222-222222222221',
    '22222222-2222-2222-2222-222222222222',
    'Return policy',
    'Returns for supplements',
    'Returns are accepted within 15 days of delivery only for sealed products. Damaged products must be reported within 48 hours with photos and batch details.'
  ),
  (
    'f2222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    'Refund policy',
    'Refund eligibility',
    'Refunds are issued only after warehouse inspection. Opened supplements are not refundable unless damage or leakage is verified within 48 hours of delivery.'
  ),
  (
    'f2222222-2222-2222-2222-222222222223',
    '22222222-2222-2222-2222-222222222222',
    'Shipping policy',
    'Shipping and replacements',
    'Orders ship in 2-4 business days. Approved replacement products are shipped after the original claim is verified by support.'
  ),
  (
    'f2222222-2222-2222-2222-222222222224',
    '22222222-2222-2222-2222-222222222222',
    'Cancellation policy',
    'Cancellation before dispatch',
    'Orders can be cancelled before dispatch. Once shipped, cancellation is unavailable and the return policy applies.'
  )
on conflict (id) do nothing;
