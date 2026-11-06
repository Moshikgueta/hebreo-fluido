-- Os dados da nota fiscal (06/11/2026, pedido do dono, depois de falar com o
-- contador): o nome completo e o CPF de quem compra, pedidos no checkout do
-- site brasileiro (Mercado Pago). Guardados no PEDIDO, e não na conta: são os
-- dados daquela venda. O CPF vai só com os 11 dígitos. Pedidos de antes desta
-- migração, e os dos sites de fora (Paddle, Stripe), ficam com NULL.
ALTER TABLE orders ADD COLUMN nome_completo TEXT;
ALTER TABLE orders ADD COLUMN cpf TEXT;
