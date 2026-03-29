import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Compliance Guardrail Engine
  app.post("/api/compliance/check", (req, res) => {
    const { amount, counterparty, category } = req.body;
    
    const rules = [];
    let status = "safe";
    let riskScore = 0;

    // Rule 1: High value threshold (RBI/SEBI inspired)
    if (amount > 1000000) {
      rules.push("Transaction exceeds high-value threshold (1,000,000 INR) - Requires Form 60/61 validation");
      status = "warning";
      riskScore += 40;
    }

    // Rule 2: Suspicious counterparty (AML/KYC)
    const suspiciousCounterparties = ["Shell Corp", "Tax Haven Ltd", "Unknown Entity", "Offshore Holdings"];
    if (suspiciousCounterparties.some(sc => counterparty.toLowerCase().includes(sc.toLowerCase()))) {
      rules.push("Counterparty flagged in AML watch list - Potential shell company detected");
      status = "violation";
      riskScore += 60;
    }

    // Rule 3: Category mismatch (IFRS/Tax)
    if (category === "Personal" && amount > 50000) {
      rules.push("Personal transaction exceeds limit for non-business accounts - Potential tax evasion risk");
      status = "warning";
      riskScore += 20;
    }

    // Rule 4: Round number detection (Fraud detection)
    if (amount > 10000 && amount % 1000 === 0) {
      rules.push("Round number transaction detected - Potential manual entry or kickback risk");
      riskScore += 10;
    }

    // Rule 5: Investment without KYC (SEBI)
    if (category === "Investment" && amount > 200000) {
      rules.push("Large investment detected - Verify SEBI KYC compliance status");
      status = status === "safe" ? "warning" : status;
      riskScore += 15;
    }

    if (riskScore > 80) status = "violation";
    else if (riskScore > 30) status = "warning";

    res.json({
      status,
      riskScore: Math.min(riskScore, 100),
      rulesTriggered: rules,
      explanation: rules.length > 0 ? `Flagged due to: ${rules.join(", ")}` : "Transaction is within normal parameters."
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
