create or replace function public.enforce_forum_content_policy()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  message_text text;
begin
  message_text := lower(coalesce(new.author_name, '') || ' ' || coalesce(new.body, ''));

  if message_text ~ '(^|[^[:alnum:]])(hitler|drogen|drugs|fuck[[:space:]]+you|arschloch|bastard|bitch|blödmann|cunt|dickhead|fuck|fucking|hurensohn|idiot|moron|motherfucker|retard|schlampe|shit|slut|spast|whore|wichser|wixer|kill|murder|shoot|stab|bomb|umbringen|töten|erschießen|abstechen|rape|molest|grooming|vergewaltig|missbrauch|cocaine|kokain|heroin|meth|crack|ecstasy|mdma|ketamine|ketamin|fentanyl|cannabis|marijuana|weed|haschisch|koks|gras|lsd)($|[^[:alnum:]])' then
    raise exception using
      errcode = 'P0001',
      message = 'This message may violate our Community Guidelines. Please remove insults, threats, abuse, and drug-related language.';
  end if;

  return new;
end;
$$;
