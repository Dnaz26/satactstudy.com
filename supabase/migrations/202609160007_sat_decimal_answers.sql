create or replace function public.sat_answer_matches(selected text, canonical text) returns boolean
language plpgsql immutable strict set search_path=public as $$
declare av numeric; bv numeric; a text:=replace(trim(selected),',',''); b text:=replace(trim(canonical),',',''); digits integer; integers integer; decimalparts text[];
begin
 if a='' or b='' then return false; end if;
 if upper(a)=upper(b) then return true; end if;
 if a ~ '^[+-]?([0-9]+(\.[0-9]*)?|\.[0-9]+)$' then av:=a::numeric;
 elsif a ~ '^[+-]?[0-9]+\s*/\s*[+-]?[0-9]+$' then av:=split_part(a,'/',1)::numeric/nullif(split_part(a,'/',2)::numeric,0);
 else return false; end if;
 if b ~ '^[+-]?([0-9]+(\.[0-9]*)?|\.[0-9]+)$' then bv:=b::numeric;
 elsif b ~ '^[+-]?[0-9]+\s*/\s*[+-]?[0-9]+$' then bv:=split_part(b,'/',1)::numeric/nullif(split_part(b,'/',2)::numeric,0);
 else return false; end if;
 if av is null or bv is null then return false; end if;
 if abs(av-bv)<0.000000001 then return true; end if;
 decimalparts:=regexp_match(a,'^[+-]?([0-9]*)\.([0-9]+)$');
 if decimalparts is null then return false; end if;
 integers:=length(regexp_replace(decimalparts[1],'^0+(?=[0-9])',''));
 digits:=length(decimalparts[2]);
 if digits<greatest(1,4-integers) or digits>12 then return false; end if;
 return abs(av-round(bv,digits))<0.000000001 or abs(av-trunc(bv,digits))<0.000000001;
end $$;
