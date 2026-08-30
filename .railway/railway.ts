import { defineRailway, github, preserve, project, service } from "railway/iac";

export default defineRailway(() => {
  const backend = service("backend", {
    source: github("NairbN/SortFlow", { checkSuites: false, rootDirectory: "backend" }),
    replicas: { "sfo": 1 },
    env: { BACKEND_API_KEY: preserve(), DATABASE_URL: preserve(), ENVIRONMENT: preserve() },
  });

  return project("SortFlow", {
    resources: [backend],
  });
});
