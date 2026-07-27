-- Member-owned Elite Tools preferences and structured XAUUSD analysis.

CREATE TABLE IF NOT EXISTS public.elite_tool_workspaces (
  user_id       UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  preferences   JSONB NOT NULL DEFAULT '{}'::JSONB,
  analysis      JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT elite_workspace_preferences_object
    CHECK (jsonb_typeof(preferences) = 'object'),
  CONSTRAINT elite_workspace_analysis_object
    CHECK (jsonb_typeof(analysis) = 'object')
);

DROP TRIGGER IF EXISTS trg_elite_tool_workspaces_updated ON public.elite_tool_workspaces;
CREATE TRIGGER trg_elite_tool_workspaces_updated
  BEFORE UPDATE ON public.elite_tool_workspaces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.elite_tool_workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members manage own Elite Tools workspace" ON public.elite_tool_workspaces;
CREATE POLICY "Members manage own Elite Tools workspace"
  ON public.elite_tool_workspaces FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
