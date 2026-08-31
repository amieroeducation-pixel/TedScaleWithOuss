-- Seed: 5 thèmes patrimoniaux pour le nurturing
-- Insère uniquement si le thème n'existe pas déjà (par nom)

INSERT INTO nurturing_themes (name, color, icon)
SELECT name, color, icon FROM (VALUES
  ('Constituer une épargne', '#4ecdc4', '💰'),
  ('Valoriser une épargne', '#7a92e8', '📈'),
  ('Transmettre', '#b07aee', '🏠'),
  ('Gérer la fiscalité de l''épargne', '#e8c878', '🧾'),
  ('Préparation à la retraite', '#ff6470', '🎯')
) AS t(name, color, icon)
WHERE NOT EXISTS (
  SELECT 1 FROM nurturing_themes nt WHERE nt.name = t.name
);
