import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as dotenv from "dotenv";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Serveur RGPD Analyzer démarré");
}

main();