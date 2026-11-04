-- A gravação marcada para regravar (04/11/2026, pedido do dono): `pendente`
-- = 1 põe o item no filtro "Pendentes" do painel /admin/gravar. O aluno
-- continua ouvindo a gravação que existe até a nova ser salva, e salvar de
-- novo tira a marca (api/audio.js).
ALTER TABLE gravacoes ADD COLUMN pendente INTEGER NOT NULL DEFAULT 0;

-- As duas que a conferência de 04/11/2026 achou no limite do volume:
-- nº 795 (káma?, a1 unidade 7) e nº 838 (itách, a1 unidade 8).
UPDATE gravacoes SET pendente = 1 WHERE audio_id IN ('he-e1b99071', 'he-ab64c4a9');
