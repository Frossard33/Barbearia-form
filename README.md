# Painel de Inadimplência — Tecinco

Dashboard estático (HTML/JS) para a diretoria: títulos a receber (clientes) e a pagar (fornecedores) por filial.

## Atualizar os dados
```
pip install openpyxl
python3 scripts/build_data.py caminho/planilha.xlsx 2026-10-06   # data do relatório
```
Gera `js/data.js` (fonte: aba "Base de dados"; pagamentos: colunas "Data de Pagamento/Valor" das abas "Cobrança Adm"). Depois é só dar commit/push.

## Ajustes compartilhados (cor do cliente, observação, ocultar)
Sem configuração, ficam salvos só no navegador de cada pessoa. Para compartilhar:
1. Crie um projeto gratuito em supabase.com e rode `supabase.sql`.
2. Preencha `SUPABASE_URL` e `SUPABASE_ANON_KEY` em `js/config.js`.

Atenção: as políticas do SQL permitem que qualquer pessoa com o link altere os ajustes.

## Publicação
GitHub Pages via `.github/workflows/pages.yml` (Settings → Pages → Source: GitHub Actions).
