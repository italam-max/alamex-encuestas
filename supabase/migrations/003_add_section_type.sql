-- Agrega 'section' como tipo valido de pregunta
ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_type_check;
ALTER TABLE public.questions ADD CONSTRAINT questions_type_check CHECK (type IN ('rating','nps','multiple','checkbox','text','yesno','section'));
