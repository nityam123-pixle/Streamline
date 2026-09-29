import * as React from "react"
import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Preview,
} from "@react-email/components"

export interface ResetPasswordEmailProps {
  userEmail?: string
  userName?: string
  resetUrl: string
}

export function ResetPasswordEmail({
  userEmail = "owner@company.com",
  userName = "there",
  resetUrl = "http://localhost:3000/reset-password?token=sample-token",
}: ResetPasswordEmailProps) {
  const previewText = "Reset your Streamline account password"

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
                          <span style={workspaceHeaderText}>Account Security</span>
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
                          {/* Security Icon Badge */}
                          <table role="presentation" cellPadding="0" cellSpacing="0" border={0}>
                            <tbody>
                              <tr>
                                <td align="center" valign="middle" style={lockIconCell}>
                                  <span style={lockIconText}>⚿</span>
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          {/* Eyebrow */}
                          <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" border={0} style={{ marginTop: "18px" }}>
                            <tbody>
                              <tr>
                                <td style={eyebrowText}>PASSWORD RECOVERY</td>
                              </tr>
                            </tbody>
                          </table>

                          {/* Title */}
                          <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" border={0} style={{ marginTop: "6px" }}>
                            <tbody>
                              <tr>
                                <td style={titleText}>
                                  Reset your password
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          {/* Description */}
                          <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" border={0} style={{ marginTop: "10px" }}>
                            <tbody>
                              <tr>
                                <td style={descriptionText}>
                                  Hello {userName}, we received a request to reset the password for your Streamline account associated with <strong style={strongUser}>{userEmail}</strong>. Select the button below to choose a new password.
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          {/* Primary Action Button */}
                          <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" border={0} style={{ marginTop: "24px" }}>
                            <tbody>
                              <tr>
                                <td>
                                  <Button href={resetUrl} style={buttonStyle}>
                                    Reset password
                                  </Button>
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          {/* Expiration and Usage Note */}
                          <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" border={0} style={{ marginTop: "18px" }}>
                            <tbody>
                              <tr>
                                <td style={smallTextStyle}>
                                  This password reset link will expire in 1 hour and can only be used once.
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          {/* Divider */}
                          <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" border={0} style={{ marginTop: "24px" }}>
                            <tbody>
                              <tr>
                                <td style={cardDividerStyle}></td>
                              </tr>
                            </tbody>
                          </table>

                          {/* Security Notice */}
                          <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" border={0} style={{ marginTop: "16px" }}>
                            <tbody>
                              <tr>
                                <td style={smallTextStyle}>
                                  If you did not request this password reset, please ignore this email or reach out to support if you have security concerns. Your current password remains secure.
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Footer */}
                  <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" border={0} style={{ marginTop: "18px" }}>
                    <tbody>
                      <tr>
                        <td align="center" style={footerCell}>
                          <div>
                            Sent securely by Streamline Authentication System
                          </div>
                          <div style={{ marginTop: "6px" }}>
                            © Streamline
                          </div>
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

export default ResetPasswordEmail

/* Styles matching Streamline design system */
const bodyStyle: React.CSSProperties = {
  margin: "0",
  padding: "0",
  width: "100%",
  backgroundColor: "#f5f5f5",
  color: "#171717",
  fontFamily:
    'Inter, Geist, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  WebkitFontSmoothing: "antialiased",
}

const pageTable: React.CSSProperties = {
  width: "100%",
  backgroundColor: "#f5f5f5",
  margin: "0",
  padding: "0",
  borderCollapse: "collapse",
}

const outerCell: React.CSSProperties = {
  padding: "28px 18px",
}

const containerStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "680px",
  margin: "0 auto",
}

const topbarTable: React.CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #e8e8e8",
  borderRadius: "8px 8px 0 0",
  borderCollapse: "collapse",
}

const topbarBrandCell: React.CSSProperties = {
  padding: "11px 13px",
  verticalAlign: "middle",
}

const brandText: React.CSSProperties = {
  color: "#161616",
  fontSize: "14px",
  lineHeight: "20px",
  fontWeight: 600,
  letterSpacing: "-0.02em",
  whiteSpace: "nowrap" as const,
}

const brandMark: React.CSSProperties = {
  display: "inline-block",
  width: "17px",
  height: "17px",
  marginRight: "6px",
  borderRadius: "5px",
  backgroundColor: "#242424",
  color: "#ffffff",
  fontSize: "10px",
  lineHeight: "17px",
  textAlign: "center" as const,
  verticalAlign: "-2px",
}

const topbarWorkspaceCell: React.CSSProperties = {
  padding: "11px 13px",
  verticalAlign: "middle",
  textAlign: "right" as const,
}

const workspaceHeaderText: React.CSSProperties = {
  color: "#8a8a8a",
  fontSize: "12px",
  lineHeight: "18px",
  fontWeight: 400,
}

const mainCardTable: React.CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #e7e7e7",
  borderTop: "none",
  borderRadius: "0 0 9px 9px",
  borderCollapse: "collapse",
}

const mainCardInner: React.CSSProperties = {
  padding: "30px",
}

const lockIconCell: React.CSSProperties = {
  width: "36px",
  height: "36px",
  borderRadius: "7px",
  backgroundColor: "#f4f4f5",
  border: "1px solid #e4e4e7",
  color: "#18181b",
  textAlign: "center" as const,
  verticalAlign: "middle",
}

const lockIconText: React.CSSProperties = {
  fontSize: "16px",
  lineHeight: "36px",
  fontWeight: 600,
  display: "block",
}

const eyebrowText: React.CSSProperties = {
  color: "#8a8a8a",
  fontSize: "11px",
  lineHeight: "16px",
  fontWeight: 500,
  letterSpacing: "0.01em",
}

const titleText: React.CSSProperties = {
  color: "#171717",
  fontSize: "24px",
  lineHeight: "30px",
  fontWeight: 600,
  letterSpacing: "-0.035em",
}

const descriptionText: React.CSSProperties = {
  color: "#777777",
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: 400,
}

const strongUser: React.CSSProperties = {
  color: "#444444",
  fontWeight: 500,
}

const buttonStyle: React.CSSProperties = {
  display: "inline-block",
  backgroundColor: "#161616",
  border: "1px solid #161616",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "12px",
  lineHeight: "18px",
  fontWeight: 500,
  padding: "9px 16px",
  textDecoration: "none",
  textAlign: "center" as const,
}

const smallTextStyle: React.CSSProperties = {
  color: "#8a8a8a",
  fontSize: "11px",
  lineHeight: "17px",
}

const cardDividerStyle: React.CSSProperties = {
  borderTop: "1px solid #ebebeb",
  height: "1px",
  fontSize: "1px",
  lineHeight: "1px",
}

const footerCell: React.CSSProperties = {
  color: "#a0a0a0",
  fontSize: "10px",
  lineHeight: "16px",
  textAlign: "center" as const,
  padding: "18px 10px 4px",
}
