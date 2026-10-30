-- Backs the Settings -> Security tab: list the caller's own live sessions and
-- let them sign one out.
--
-- GoTrue does not expose session listing through the public API on this
-- project (`/auth/v1/admin/users/{id}/sessions` returns 404) and the `auth`
-- schema is not exposed to PostgREST at all, so a SECURITY DEFINER function
-- reads `auth.sessions` on the caller's behalf. Every statement is pinned to
-- `auth.uid()`, so a signed-in reseller can only ever see or revoke their own
-- rows; `authenticated` is the only role granted EXECUTE.
--
-- Revocation is addressed by session UUID rather than "everything except the
-- current one", so passing the wrong id can never sign the caller out.
-- `auth.sessions` has no foreign keys on this project (GoTrue relies on
-- application logic), so the matching refresh tokens are revoked explicitly.

CREATE OR REPLACE FUNCTION public.current_session_id() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  SELECT NULLIF(
      current_setting('request.jwt.claims', true)::jsonb ->> 'session_id',
      ''
  )::uuid;
$$;

COMMENT ON FUNCTION public.current_session_id() IS
    'The session id in the caller''s own JWT, or NULL outside a request.';

CREATE OR REPLACE FUNCTION public.get_my_active_sessions()
RETURNS TABLE (
    id uuid,
    created_at timestamp with time zone,
    last_active timestamp with time zone,
    ip text,
    user_agent text,
    aal text,
    is_current boolean
)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path = public, pg_temp
    AS $$
  SELECT
      s.id,
      s.created_at,
      -- refreshed_at is the last token refresh; updated_at is written on
      -- every rotation. Fall back to creation so the column is never null.
      COALESCE(
          s.refreshed_at AT TIME ZONE 'UTC',
          s.updated_at,
          s.created_at
      ) AS last_active,
      host(s.ip) AS ip,
      s.user_agent,
      s.aal::text,
      s.id = public.current_session_id() AS is_current
  FROM auth.sessions s
  WHERE s.user_id = auth.uid()
    AND COALESCE(s.not_after, 'infinity'::timestamp with time zone) > now()
    -- A session row without a live refresh token cannot be resumed.
    AND EXISTS (
        SELECT 1 FROM auth.refresh_tokens t
        WHERE t.session_id = s.id AND t.revoked IS NOT TRUE
    )
  ORDER BY is_current DESC, last_active DESC;
$$;

COMMENT ON FUNCTION public.get_my_active_sessions() IS
    'Live sessions for the caller only, newest first, current session first.';

CREATE OR REPLACE FUNCTION public.revoke_my_session(p_session_id uuid)
RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public, pg_temp
    AS $$
DECLARE
    v_user uuid := auth.uid();
BEGIN
    IF v_user IS NULL OR p_session_id IS NULL THEN
        RETURN false;
    END IF;

    -- Never revoke the caller's own session; the dashboard signs out normally.
    IF p_session_id = public.current_session_id() THEN
        RETURN false;
    END IF;

    DELETE FROM auth.refresh_tokens
    WHERE session_id = p_session_id AND user_id = v_user::text;

    DELETE FROM auth.sessions
    WHERE id = p_session_id AND user_id = v_user;

    RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION public.revoke_my_session(uuid) IS
    'Signs out one of the caller''s own sessions. Returns false for the '
    'current session or an id the caller does not own.';

REVOKE ALL ON FUNCTION public.current_session_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_active_sessions() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_my_session(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.current_session_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_active_sessions() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.revoke_my_session(uuid) TO authenticated, service_role;

-- GoTrue has no "password last changed" column, so the Security tab reads the
-- timestamp from here. Written by the changePassword action via the admin
-- client (the table is RLS-locked).
ALTER TABLE public.global_reseller_applications
    ADD COLUMN IF NOT EXISTS password_changed_at timestamp with time zone;

COMMENT ON COLUMN public.global_reseller_applications.password_changed_at IS
    'When the reseller last changed their password through the dashboard.';
