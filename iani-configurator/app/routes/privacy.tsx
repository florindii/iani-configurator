import type { LoaderFunctionArgs } from "@remix-run/node";

export async function loader({ request }: LoaderFunctionArgs) {
  return null;
}

export default function Privacy() {
  return (
    <div style={{
      padding: "40px 20px",
      maxWidth: "800px",
      margin: "0 auto",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      lineHeight: 1.6,
      color: "#333"
    }}>
      <h1 style={{ marginBottom: "8px" }}>Privacy Policy</h1>
      <p style={{ color: "#666", marginBottom: "32px" }}>
        Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>

      <section style={{ marginBottom: "32px" }}>
        <h2>Overview</h2>
        <p>
          Iani 3D Configurator ("we", "our", or "the App") is committed to protecting your privacy.
          This Privacy Policy explains how we collect, use, and safeguard your information when you
          use our Shopify application.
        </p>
      </section>

      <section style={{ marginBottom: "32px" }}>
        <h2>Data We Collect</h2>
        <p>When you use the Iani 3D Configurator, we may collect:</p>
        <ul>
          <li><strong>Product Configuration Data:</strong> Your customization choices including colors, materials, and other product options</li>
          <li><strong>Preview Images:</strong> Generated images of your customized products</li>
          <li><strong>Email Address:</strong> Only if you choose to save configurations for later</li>
          <li><strong>Order Information:</strong> Configuration details attached to orders for fulfillment</li>
        </ul>
      </section>

      <section style={{ marginBottom: "32px" }}>
        <h2>How We Use Your Data</h2>
        <p>We use the collected data to:</p>
        <ul>
          <li>Save and restore your product customizations</li>
          <li>Generate preview images of configured products</li>
          <li>Process orders with your custom configurations</li>
          <li>Improve our configurator experience</li>
          <li>Provide customer support</li>
        </ul>
      </section>

      <section style={{ marginBottom: "32px" }}>
        <h2>Data Sharing</h2>
        <p>We do not sell your personal data. We may share data with:</p>
        <ul>
          <li><strong>Shopify:</strong> As required for app functionality and order processing</li>
          <li><strong>Store Merchants:</strong> Configuration data necessary for order fulfillment</li>
          <li><strong>Service Providers:</strong> Trusted third parties who help us operate our service (e.g., hosting providers)</li>
        </ul>
      </section>

      <section style={{ marginBottom: "32px" }}>
        <h2>Data Retention</h2>
        <p>
          We retain configuration data for 90 days after creation, or until you request deletion.
          Order-related configuration data may be retained longer as required for business records.
        </p>
      </section>

      <section style={{ marginBottom: "32px" }}>
        <h2>Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li><strong>Access:</strong> Request a copy of your data</li>
          <li><strong>Deletion:</strong> Request deletion of your data</li>
          <li><strong>Correction:</strong> Request correction of inaccurate data</li>
          <li><strong>Portability:</strong> Receive your data in a structured format</li>
        </ul>
        <p>
          To exercise these rights, please contact the store where you made your purchase,
          or reach out to us directly.
        </p>
      </section>

      <section style={{ marginBottom: "32px" }}>
        <h2>Data Security</h2>
        <p>
          We implement appropriate technical and organizational measures to protect your data,
          including encryption in transit and at rest, secure hosting infrastructure, and
          regular security assessments.
        </p>
      </section>

      <section style={{ marginBottom: "32px" }}>
        <h2>Cookies and Tracking</h2>
        <p>
          The Iani 3D Configurator uses minimal cookies necessary for functionality.
          We do not use tracking cookies or third-party analytics within the configurator.
        </p>
      </section>

      <section style={{ marginBottom: "32px" }}>
        <h2>Children's Privacy</h2>
        <p>
          Our service is not directed to children under 13. We do not knowingly collect
          personal information from children under 13.
        </p>
      </section>

      <section style={{ marginBottom: "32px" }}>
        <h2>Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of any
          changes by posting the new Privacy Policy on this page and updating the
          "Last updated" date.
        </p>
      </section>

      <section style={{ marginBottom: "32px" }}>
        <h2>Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy or our data practices,
          please contact us at:
        </p>
        <p style={{ padding: "16px", background: "#f5f5f5", borderRadius: "8px" }}>
          <strong>Iani 3D Configurator</strong><br />
          Email: support@iani-configurator.com
        </p>
      </section>

      <footer style={{ marginTop: "48px", paddingTop: "24px", borderTop: "1px solid #eee", color: "#666", fontSize: "14px" }}>
        <p>© {new Date().getFullYear()} Iani 3D Configurator. All rights reserved.</p>
      </footer>
    </div>
  );
}
