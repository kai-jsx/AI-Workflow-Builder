import { useEffect, useState } from "react";

import WorkflowEditor from "./pages/WorkflowEditor/workflowEditor";

import { nhost } from "./lib/nhost";

import { getWorkflows } from "./graphql/workflows";
import type { Workflow } from "./graphql/workflows";

import { getMyOrganization } from "./graphql/queries/organization";

import { createWorkflow } from "./graphql/mutations/workflows";

function App() {

  console.log(
  "CURRENT USER ID:",
  nhost.getUserSession()?.user?.id
);
  // ==========================================
  // AUTH SESSION
  // ==========================================

  const [session, setSession] = useState(() =>
    nhost.getUserSession()
  );

  // ==========================================
  // SELECTED WORKFLOW
  // ==========================================

  const [selectedWorkflow, setSelectedWorkflow] =
    useState<Workflow | null>(null);

  // ==========================================
  // LOGIN
  // ==========================================

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // ==========================================
  // WORKFLOWS
  // ==========================================

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  const [workflowError, setWorkflowError] = useState<string | null>(null);

  // ==========================================
  // CREATE WORKFLOW
  // ==========================================

  const [showCreate, setShowCreate] = useState(false);

  const [workflowName, setWorkflowName] = useState("");
  const [workflowDescription, setWorkflowDescription] = useState("");

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // ==========================================
  // LOAD WORKFLOWS
  // ==========================================

  const loadWorkflows = async () => {
    try {
      setLoadingWorkflows(true);
      setWorkflowError(null);

      const data = await getWorkflows();

      console.log("WORKFLOWS:", data);

      setWorkflows(data);
    } catch (error) {
      console.error("WORKFLOW ERROR:", error);

      setWorkflowError(
        error instanceof Error
          ? error.message
          : "Failed to load workflows."
      );
    } finally {
      setLoadingWorkflows(false);
    }
  };

  // ==========================================
  // LOAD WORKFLOWS AFTER LOGIN
  // ==========================================

  useEffect(() => {
    if (!session?.user) {
      return;
    }

    const timer = window.setTimeout(() => {
      void loadWorkflows();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [session]);

  // ==========================================
  // LOGIN
  // ==========================================

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setLoginError("Please enter your email and password.");
      return;
    }

    try {
      setLoginLoading(true);
      setLoginError(null);

      await nhost.auth.signInEmailPassword({
        email: email.trim(),
        password,
      });

      const storedSession = nhost.getUserSession();

      if (!storedSession?.user) {
        throw new Error(
          "Login succeeded but no user session was found."
        );
      }

      setSession(storedSession);

      console.log("Logged-in user:", storedSession.user);
    } catch (error) {
      console.error("LOGIN ERROR:", error);

      setLoginError(
        error instanceof Error
          ? error.message
          : "Unable to sign in."
      );
    } finally {
      setLoginLoading(false);
    }
  };

  // ==========================================
  // LOGOUT
  // ==========================================

  const handleLogout = async () => {
    try {
      await nhost.auth.signOut({});

      setSession(null);
      setWorkflows([]);
      setSelectedWorkflow(null);

      setShowCreate(false);
      setWorkflowName("");
      setWorkflowDescription("");

      setLoginError(null);
      setWorkflowError(null);
      setCreateError(null);
    } catch (error) {
      console.error("LOGOUT ERROR:", error);
    }
  };

  // ==========================================
  // CREATE WORKFLOW
  // ==========================================

  const handleCreateWorkflow = async () => {
    if (!workflowName.trim()) {
      setCreateError("Please enter a workflow name.");
      return;
    }

    try {
      setCreating(true);
      setCreateError(null);

      const organization = await getMyOrganization();

      console.log("MY ORGANIZATION:", organization);

      if (!organization?.org_id) {
        throw new Error(
          "No organization is associated with this account."
        );
      }

      const newWorkflow = await createWorkflow(
        workflowName.trim(),
        workflowDescription.trim(),
        organization.org_id
      );

      console.log("WORKFLOW CREATED:", newWorkflow);

      setWorkflows((currentWorkflows) => [
        newWorkflow,
        ...currentWorkflows,
      ]);

      setWorkflowName("");
      setWorkflowDescription("");
      setShowCreate(false);
    } catch (error) {
      console.error("CREATE WORKFLOW ERROR:", error);

      setCreateError(
        error instanceof Error
          ? error.message
          : "Failed to create workflow."
      );
    } finally {
      setCreating(false);
    }
  };

  // ==========================================
  // LOGIN SCREEN
  // ==========================================

  if (!session?.user) {
    return (
      <div style={styles.page}>
        <div style={styles.loginCard}>
          <h1 style={styles.title}>
            AI Workflow Builder
          </h1>

          <p style={styles.subtitle}>
            Sign in to continue
          </p>

          <label style={styles.label}>
            Email
          </label>

          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
            }}
            style={styles.input}
          />

          <label style={styles.label}>
            Password
          </label>

          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void handleLogin();
              }
            }}
            style={styles.input}
          />

          {loginError && (
            <p style={styles.error}>
              {loginError}
            </p>
          )}

          <button
            onClick={() => {
              void handleLogin();
            }}
            disabled={loginLoading}
            style={styles.primaryButton}
          >
            {loginLoading ? "Signing in..." : "Sign In"}
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // WORKFLOW EDITOR
  // ==========================================

  if (selectedWorkflow) {
    return (
      <WorkflowEditor
        workflow={selectedWorkflow}
        onBack={() => {
          setSelectedWorkflow(null);
        }}
      />
    );
  }

  // ==========================================
  // MAIN APPLICATION
  // ==========================================

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>
              AI Workflow Builder
            </h1>

            <p style={styles.subtitle}>
              Welcome,{" "}
              <strong>
                {session.user.email}
              </strong>
            </p>
          </div>

          <button
            onClick={() => {
              void handleLogout();
            }}
            style={styles.logoutButton}
          >
            Logout
          </button>
        </div>

        <section>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                Workflows
              </h2>

              <p style={styles.sectionSubtitle}>
                Create and manage your AI workflows.
              </p>
            </div>

            <button
              onClick={() => {
                setShowCreate(true);
                setCreateError(null);
              }}
              style={styles.primaryButton}
            >
              + Create Workflow
            </button>
          </div>

          {showCreate && (
            <div style={styles.createCard}>
              <h3>
                Create New Workflow
              </h3>

              <label style={styles.label}>
                Workflow Name
              </label>

              <input
                type="text"
                placeholder="e.g. Resume Screening"
                value={workflowName}
                onChange={(event) => {
                  setWorkflowName(event.target.value);
                }}
                style={styles.input}
              />

              <label style={styles.label}>
                Description
              </label>

              <textarea
                placeholder="Describe your workflow..."
                value={workflowDescription}
                onChange={(event) => {
                  setWorkflowDescription(event.target.value);
                }}
                style={styles.textarea}
              />

              {createError && (
                <p style={styles.error}>
                  {createError}
                </p>
              )}

              <div style={styles.formButtons}>
                <button
                  onClick={() => {
                    void handleCreateWorkflow();
                  }}
                  disabled={creating}
                  style={styles.successButton}
                >
                  {creating
                    ? "Creating..."
                    : "Create Workflow"}
                </button>

                <button
                  onClick={() => {
                    setShowCreate(false);
                    setCreateError(null);
                  }}
                  disabled={creating}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {loadingWorkflows && (
            <div style={styles.message}>
              Loading workflows...
            </div>
          )}

          {workflowError && (
            <div style={styles.errorBox}>
              {workflowError}
            </div>
          )}

          {!loadingWorkflows &&
            !workflowError &&
            workflows.length === 0 && (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>
                  ⚡
                </div>

                <h3>
                  No workflows yet
                </h3>

                <p>
                  Create your first AI workflow
                  to get started.
                </p>

                <button
                  onClick={() => {
                    setShowCreate(true);
                    setCreateError(null);
                  }}
                  style={styles.primaryButton}
                >
                  Create Your First Workflow
                </button>
              </div>
            )}

          {!loadingWorkflows &&
            workflows.length > 0 && (
              <div style={styles.workflowGrid}>
                {workflows.map((workflow) => (
                  <div
                    key={workflow.id}
                    style={styles.workflowCard}
                  >
                    <h3>
                      {workflow.name}
                    </h3>

                    <p style={styles.workflowDescription}>
                      {workflow.description ||
                        "No description provided."}
                    </p>

                    <div style={styles.workflowMeta}>
                      Created{" "}
                      {new Date(
                        workflow.created_at
                      ).toLocaleDateString()}
                    </div>

                    <button
                      style={styles.openButton}
                      onClick={() => {
                        setSelectedWorkflow(workflow);
                      }}
                    >
                      Open Workflow →
                    </button>
                  </div>
                ))}
              </div>
            )}
        </section>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f5f7fb",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "30px",
    boxSizing: "border-box" as const,
    fontFamily:
      "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  },

  container: {
    width: "100%",
    maxWidth: "1000px",
    minHeight: "650px",
    background: "#ffffff",
    borderRadius: "16px",
    padding: "40px",
    boxSizing: "border-box" as const,
    boxShadow:
      "0 10px 40px rgba(0,0,0,0.08)",
  },

  loginCard: {
    width: "100%",
    maxWidth: "420px",
    background: "#ffffff",
    padding: "40px",
    borderRadius: "16px",
    boxSizing: "border-box" as const,
    boxShadow:
      "0 10px 40px rgba(0,0,0,0.08)",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "40px",
  },

  title: {
    margin: 0,
    fontSize: "32px",
    fontWeight: 700,
    color: "#111827",
  },

  subtitle: {
    color: "#6b7280",
    marginTop: "8px",
    marginBottom: "25px",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "25px",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "24px",
    color: "#111827",
  },

  sectionSubtitle: {
    marginTop: "6px",
    color: "#6b7280",
  },

  label: {
    display: "block",
    marginBottom: "8px",
    marginTop: "15px",
    fontSize: "14px",
    fontWeight: 600,
    color: "#374151",
  },

  input: {
    width: "100%",
    padding: "12px 14px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "15px",
    boxSizing: "border-box" as const,
  },

  textarea: {
    width: "100%",
    minHeight: "100px",
    padding: "12px 14px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "15px",
    resize: "vertical" as const,
    boxSizing: "border-box" as const,
    fontFamily: "inherit",
  },

  primaryButton: {
    background: "#2563eb",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    padding: "11px 18px",
    fontWeight: 600,
    cursor: "pointer",
  },

  successButton: {
    background: "#16a34a",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    padding: "11px 18px",
    fontWeight: 600,
    cursor: "pointer",
  },

  cancelButton: {
    background: "#ffffff",
    color: "#374151",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    padding: "11px 18px",
    fontWeight: 600,
    cursor: "pointer",
  },

  logoutButton: {
    background: "#dc2626",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    padding: "11px 18px",
    fontWeight: 600,
    cursor: "pointer",
  },

  createCard: {
    padding: "25px",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    background: "#fafafa",
    marginBottom: "25px",
  },

  formButtons: {
    display: "flex",
    gap: "10px",
    marginTop: "20px",
  },

  error: {
    color: "#dc2626",
    fontSize: "14px",
    marginTop: "12px",
  },

  errorBox: {
    background: "#fef2f2",
    color: "#b91c1c",
    border: "1px solid #fecaca",
    padding: "15px",
    borderRadius: "8px",
    marginBottom: "20px",
  },

  message: {
    textAlign: "center" as const,
    padding: "40px",
    color: "#6b7280",
  },

  emptyState: {
    textAlign: "center" as const,
    padding: "70px 20px",
    border: "1px dashed #d1d5db",
    borderRadius: "12px",
  },

  emptyIcon: {
    fontSize: "35px",
    marginBottom: "10px",
  },

  workflowGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "20px",
  },

  workflowCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "22px",
    background: "#ffffff",
    boxShadow:
      "0 4px 15px rgba(0,0,0,0.04)",
  },

  workflowDescription: {
    color: "#6b7280",
    lineHeight: 1.5,
    minHeight: "45px",
  },

  workflowMeta: {
    fontSize: "13px",
    color: "#9ca3af",
    marginTop: "15px",
    marginBottom: "18px",
  },

  openButton: {
    background: "#111827",
    color: "#ffffff",
    border: "none",
    borderRadius: "7px",
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 600,
  },
};

export default App;