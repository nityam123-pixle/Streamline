import * as React from "react"
import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Preview,
} from "@react-email/components"

export interface VerifyEmailProps {
  userEmail?: string
  userName?: string
  verifyUrl: string
}

export function VerifyEmail({
  userEmail = "owner@company.com",
  userName = "there",
  verifyUrl = "http://localhost:3000/verify-email?token=sample-token",
}: VerifyEmailProps) {
  const previewText = "Verify your Streamline account email address"

  return (
    <Html lang="en">
      <Head>
        <meta name="x-apple-disable-message-reformatting" />
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{previewText}</Preview>
      <Body style={bodyStyle}>
        <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" border={0} style={pageTable}>
          <tbody>
            <tr>
              <td align="center" style={outerCell}>
                <Container style={containerStyle}>
                  {/* Top Bar: Matches Streamline header */}
                  <table
                    role="presentation"
                    width="100%"
                    cellPadding="0"
                    cellSpacing="0"
                    border={0}
                    style={topbarTable}
                  >
                    <tbody>
                      <tr>
                        <td style={topbarBrandCell}>
                          <span style={brandText}>
                            <span style={brandMark}>✦</span>
                            Streamline
                          </span>
                        </td>
                        <td align="right" style={topbarWorkspaceCell}>
                          <span style={workspaceHeaderText}>Account Verification</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Main Card */}
                  <table
                    role="presentation"
                    width="100%"
                    cellPadding="0"
                    cellSpacing="0"
                    border={0}
                    style={mainCardTable}
                  >
                    <tbody>
                      <tr>
                        <td style={mainCardInner}>
                          {/* Verification Icon Badge */}
                          <table role="presentation" cellPadding="0" cellSpacing="0" border={0}>
                            <tbody>
                              <tr>
                                <td align="center" valign="middle" style={mailIconCell}>
                                  <span style={mailIconText}>✉</span>
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          {/* Eyebrow */}
                          <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" border={0} style={{ marginTop: "18px" }}>
                            <tbody>
                              <tr>
                                <td style={eyebrowText}>EMAIL VERIFICATION</td>
                              </tr>
                            </tbody>
                          </table>

                          {/* Title */}
                          <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" border={0} style={{ marginTop: "6px" }}>
                            <tbody>
                              <tr>
                                <td style={titleText}>
                                  Verify your email address
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          {/* Body Text */}
                          <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" border={0} style={{ marginTop: "12px" }}>
                            <tbody>
                              <tr>
                                <td style={bodyTextStyle}>
                                  Hi {userName}, welcome to Streamline. Please confirm your email address (<span style={boldEmail}>{userEmail}</span>) to verify your account and enable live teammate invitations.
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          {/* Action Button */}
                          <table
                            role="presentation"
                            width="100%"
                            cellPadding="0"
                            cellSpacing="0"
                            border={0}
                            style={{ marginTop: "24px", marginBottom: "20px" }}
                          >
                            <tbody>
                              <tr>
                                <td>
                                  <Button href={verifyUrl} style={buttonStyle}>
                                    Verify Email Address
                                  </Button>
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          {/* Expiration Note */}
                          <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" border={0} style={{ marginTop: "4px" }}>
                            <tbody>
                              <tr>
                                <td style={securityNoteText}>
                                  This verification link expires in <strong>24 hours</strong>. If you did not create a Streamline account, you can safely disregard this email.
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          {/* Fallback Link */}
                          <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" border={0} style={fallbackTable}>
                            <tbody>
                              <tr>
                                <td style={fallbackLabel}>
                                  Button not working? Copy and paste this URL into your browser:
                                </td>
                              </tr>
                              <tr>
                                <td style={fallbackUrlCell}>
                                  <a href={verifyUrl} style={fallbackUrlLink}>
                                    {verifyUrl}
                                  </a>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Footer */}
                  <table
                    role="presentation"
                    width="100%"
                    cellPadding="0"
                    cellSpacing="0"
                    border={0}
                    style={footerTable}
                  >
                    <tbody>
                      <tr>
                        <td align="center" style={footerText}>
                          Streamline Inc. · 100 Montgomery St, Suite 1400 · San Francisco, CA 94104
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style={footerSubtext}>
                          Automated transactional email sent to protect account security.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </Container>
              </td>
            </tr>
          </tbody>
        </table>
      </Body>
    </Html>
  )
}

export default VerifyEmail

// Styles matching Streamline design tokens
const bodyStyle: React.CSSProperties = {
  backgroundColor: "#FAFAFA",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  margin: 0,
  padding: 0,
  WebkitFontSmoothing: "antialiased",
}

const pageTable: React.CSSProperties = {
  backgroundColor: "#FAFAFA",
  margin: 0,
  padding: "40px 16px 48px",
}

const outerCell: React.CSSProperties = {
  padding: 0,
}

const containerStyle: React.CSSProperties = {
  maxWidth: "520px",
  margin: "0 auto",
  width: "100%",
}

const topbarTable: React.CSSProperties = {
  marginBottom: "16px",
  paddingLeft: "4px",
  paddingRight: "4px",
}

const topbarBrandCell: React.CSSProperties = {
  verticalAlign: "middle",
}

const brandText: React.CSSProperties = {
  fontSize: "15px",
  fontWeight: 600,
  color: "#161616",
  letterSpacing: "-0.01em",
  display: "inline-flex",
  alignItems: "center",
}

const brandMark: React.CSSProperties = {
  color: "#000000",
  fontSize: "16px",
  marginRight: "6px",
  display: "inline-block",
}

const topbarWorkspaceCell: React.CSSProperties = {
  verticalAlign: "middle",
}

const workspaceHeaderText: React.CSSProperties = {
  fontSize: "12px",
  color: "#737373",
  letterSpacing: "0.02em",
  textTransform: "uppercase",
  fontWeight: 500,
}

const mainCardTable: React.CSSProperties = {
  backgroundColor: "#FFFFFF",
  borderRadius: "12px",
  border: "1px solid #E5E5E5",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
  overflow: "hidden",
}

const mainCardInner: React.CSSProperties = {
  padding: "36px 36px 32px",
}

const mailIconCell: React.CSSProperties = {
  width: "44px",
  height: "44px",
  borderRadius: "10px",
  backgroundColor: "#F5F5F5",
  border: "1px solid #E5E5E5",
}

const mailIconText: React.CSSProperties = {
  fontSize: "20px",
  color: "#161616",
  lineHeight: "1",
}

const eyebrowText: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  color: "#737373",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
}

const titleText: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: 600,
  color: "#161616",
  letterSpacing: "-0.02em",
  lineHeight: "1.3",
  margin: 0,
}

const bodyTextStyle: React.CSSProperties = {
  fontSize: "14px",
  color: "#525252",
  lineHeight: "1.6",
  margin: 0,
}

const boldEmail: React.CSSProperties = {
  color: "#161616",
  fontWeight: 500,
}

const buttonStyle: React.CSSProperties = {
  backgroundColor: "#161616",
  borderRadius: "8px",
  color: "#FFFFFF",
  fontSize: "14px",
  fontWeight: 500,
  letterSpacing: "-0.01em",
  textDecoration: "none",
  textAlign: "center",
  display: "block",
  padding: "13px 24px",
  width: "100%",
  boxSizing: "border-box",
}

const securityNoteText: React.CSSProperties = {
  fontSize: "12px",
  color: "#737373",
  lineHeight: "1.5",
  borderTop: "1px solid #F0F0F0",
  paddingTop: "16px",
}

const fallbackTable: React.CSSProperties = {
  marginTop: "16px",
  backgroundColor: "#F9F9F9",
  borderRadius: "6px",
  padding: "12px 14px",
  border: "1px solid #EEEEEE",
}

const fallbackLabel: React.CSSProperties = {
  fontSize: "11px",
  color: "#737373",
  lineHeight: "1.4",
}

const fallbackUrlCell: React.CSSProperties = {
  paddingTop: "6px",
  wordBreak: "break-all",
}

const fallbackUrlLink: React.CSSProperties = {
  fontSize: "11px",
  color: "#161616",
  textDecoration: "underline",
}

const footerTable: React.CSSProperties = {
  marginTop: "24px",
  paddingBottom: "8px",
}

const footerText: React.CSSProperties = {
  fontSize: "11px",
  color: "#A3A3A3",
  lineHeight: "1.5",
}

const footerSubtext: React.CSSProperties = {
  fontSize: "11px",
  color: "#A3A3A3",
  lineHeight: "1.5",
  paddingTop: "4px",
}
