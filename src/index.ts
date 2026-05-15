import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as dotenv from "dotenv";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import puppeteer from "puppeteer";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

const server = new McpServer({
  name: "rgpd-analyzer",
  version: "1.0.0",
});

// Outil 1 : récupérer le contenu d'une URL
server.tool(
  "fetch_page",
  "Récupère le contenu textuel d'une page web",
  { url: z.string() },
  async ({ url }) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Erreur HTTP : ${response.status}`);
    const html = await response.text();
    const $ = cheerio.load(html);
    // Supprimer les scripts et styles
    $("script, style, nav, footer, header").remove();
    const text = $("body").text().replace(/\s+/g, " ").trim();
    // Limiter à 5000 caractères pour ne pas surcharger
    const truncated = text.substring(0, 5000);
    return { content: [{ type: "text", text: truncated }] };
  }
);

// Outil 2 : lister les points RGPD à vérifier
server.tool(
  "rgpd_checklist",
  "Retourne la liste des points obligatoires RGPD à vérifier",
  {},
  async () => {
    const checklist = `
POINTS OBLIGATOIRES RGPD À VÉRIFIER :

1. Identité du responsable de traitement (nom, adresse, contact)
2. Finalités du traitement (pourquoi les données sont collectées)
3. Base légale du traitement (consentement, contrat, obligation légale...)
4. Durées de conservation des données
5. Droits des utilisateurs (accès, rectification, suppression, portabilité)
6. Comment exercer ses droits (email ou formulaire de contact)
7. Transfert de données hors UE (si applicable)
8. Cookies et traceurs (liste et finalités)
9. Coordonnées du DPO (si applicable)
10. Date de mise à jour de la politique
    `.trim();
    return { content: [{ type: "text", text: checklist }] };
  }
);

// Outil 3 : générer un rapport PDF
server.tool(
  "generate_pdf_report",
  "Génère un rapport PDF de conformité RGPD",
  {
    url: z.string(),
    analysis: z.string(),
    outputPath: z.string().optional()
  },
  async ({ url, analysis, outputPath }) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
        h1 { color: #1a1a2e; border-bottom: 2px solid #e63946; padding-bottom: 10px; }
        h2 { color: #457b9d; margin-top: 30px; }
        .url { background: #f1faee; padding: 10px; border-radius: 5px; font-size: 14px; }
        .date { color: #888; font-size: 13px; margin-bottom: 30px; }
        .analysis { line-height: 1.8; white-space: pre-wrap; }
        .footer { margin-top: 50px; font-size: 12px; color: #888; border-top: 1px solid #ddd; padding-top: 10px; }
      </style>
    </head>
    <body>
      <h1>Rapport d'analyse RGPD</h1>
      <div class="date">Généré le ${new Date().toLocaleDateString("fr-FR")}</div>
      <h2>Site analysé</h2>
      <div class="url">${url}</div>
      <h2>Analyse de conformité</h2>
      <div class="analysis">${analysis}</div>
      <div class="footer">Rapport généré automatiquement — Ne constitue pas un avis juridique</div>
    </body>
    </html>
    `;
    
    await page.setContent(html);
    
    const filePath = outputPath || path.join("C:\\Users\\Utilisateur\\Desktop", `rapport-rgpd-${Date.now()}.pdf`);
    await page.pdf({ path: filePath, format: "A4", margin: { top: "20px", bottom: "20px", left: "20px", right: "20px" } });
    await browser.close();
    
    return { content: [{ type: "text", text: `PDF généré : ${filePath}` }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Serveur RGPD Analyzer démarré");
}

main();