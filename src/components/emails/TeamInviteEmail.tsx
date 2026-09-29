import * as React from "react"
import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Preview,
  Section,
} from "@react-email/components"

export interface TeamInviteEmailProps {
  inviteeEmail: string
  inviterName: string
  inviterEmail?: string
  workspaceName: string
  role: string
  inviteUrl: string
}

export function TeamInviteEmail({
  inviteeEmail = "teammate@company.com",
  inviterName = "Alex",
  workspaceName = "Acme Corp",
  role = "Editor",
  inviteUrl = "http://localhost:3000/invite/sample-token",
}: TeamInviteEmailProps) {
  const previewText = `${inviterName} invited you to join ${workspaceName} on Streamline`
  const formattedRole = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()

  return (
    <Html lang="en">
      <Head>
        <meta name="x-apple-disable-message-reformatting" />
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{previewText}</Preview>
      <Body style={bodyStyle}>
        {/* Outer Page Table */}
        <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" border={0} style={pageTable}>
          <tbody>
            <tr>
              <td align="center" style={outerCell}>
                <Container style={containerStyle}>
                  {/* Top Bar: Mirrors Streamline dashboard header */}
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
                        {/* Brand */}
                        <td style={topbarBrandCell}>
                          <span style={brandText}>
                            <span style={brandMark}>✦</span>
                            Streamline
                          </span>
                        </td>
                        {/* Workspace Name */}
                        <td align="right" style={topbarWorkspaceCell}>
                          <span style={workspaceHeaderText}>{workspaceName}</span>
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
                          {/* Invitation Icon (+ Badge) */}
                          <table role="presentation" cellPadding="0" cellSpacing="0" border={0}>
                            <tbody>
                              <tr>
                                <td align="center" valign="middle" style={inviteIconCell}>
                                  <span style={inviteIconText}>+</span>
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          {/* Eyebrow */}
                          <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" border={0} style={{ marginTop: "19px" }}>
                            <tbody>
                              <tr>
                                <td style={eyebrowText}>TEAM INVITATION</td>
                              </tr>
                            </tbody>
                          </table>

                          {/* Title */}
                          <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" border={0} style={{ marginTop: "5px" }}>
                            <tbody>
                              <tr>
                                <td style={titleText}>
                                  You&#39;re invited to join {workspaceName}
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          {/* Description */}
                          <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" border={0} style={{ marginTop: "9px" }}>
                            <tbody>
                              <tr>
                                <td style={descriptionText}>
                                  <strong style={strongAuthor}>{inviterName}</strong> invited you to join{" "}
                                  <strong style={strongAuthor}>{workspaceName}</strong> on Streamline. Accept the invitation to start collaborating with your team.
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          {/* Invitation Details Card */}
                          <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" border={0} style={{ marginTop: "23px" }}>
                            <tbody>
                              <tr>
                                <td style={detailsCardCell}>
                                  {/* Row 1: Invited By & Role */}
                                  <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" border={0}>
                                    <tbody>
                                      <tr>
                                        <td width="50%" valign="top">
                                          <div style={labelStyle}>INVITED BY</div>
                                          <div style={valueStyle}>{inviterName}</div>
                                        </td>
                                        <td width="50%" valign="top" align="right">
                                          <div style={labelStyle}>ROLE</div>
                                          <div style={{ marginTop: "4px" }}>
                                            <span style={roleBadgeStyle}>{formattedRole}</span>
                                          </div>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>

                                  {/* Inner Divider */}
                                  <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" border={0} style={{ marginTop: "14px" }}>
                                    <tbody>
                                      <tr>
                                        <td style={detailsDividerStyle}></td>
                                      </tr>
                                    </tbody>
                                  </table>

                                  {/* Row 2: Invited Email & Workspace */}
                                  <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" border={0} style={{ marginTop: "13px" }}>
                                    <tbody>
                                      <tr>
                                        <td width="50%" valign="top">
                                          <div style={labelStyle}>INVITED EMAIL</div>
                                          <div style={valueEmailStyle}>{inviteeEmail}</div>
                                        </td>
                                        <td width="50%" valign="top" align="right">
                                          <div style={labelStyle}>WORKSPACE</div>
                                          <div style={valueStyle}>{workspaceName}</div>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          {/* Primary Action Button (Product Black #161616 Style) */}
                          <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" border={0} style={{ marginTop: "23px" }}>
                            <tbody>
                              <tr>
                                <td>
                                  <Button href={inviteUrl} style={buttonStyle}>
                                    Accept invitation
                                  </Button>
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          {/* Expiration Note */}
                          <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" border={0} style={{ marginTop: "18px" }}>
                            <tbody>
                              <tr>
                                <td style={smallTextStyle}>
                                  This invitation link will expire in 7 days.
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
                          <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" border={0} style={{ marginTop: "15px" }}>
                            <tbody>
                              <tr>
                                <td style={smallTextStyle}>
                                  If you weren&#39;t expecting this invitation, you can safely ignore this email.
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
                            This invitation was sent by <strong>{inviterName}</strong> through Streamline.
                          </div>
                          <div style={{ marginTop: "7px" }}>
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

export default TeamInviteEmail

/* =========================================================================
   Inline CSS Styles for Bulletproof Email Client Rendering
   ========================================================================= */

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

const inviteIconCell: React.CSSProperties = {
  width: "36px",
  height: "36px",
  borderRadius: "7px",
  backgroundColor: "#edf5ff",
  border: "1px solid #d7eaff",
  color: "#2f8df6",
  textAlign: "center" as const,
  verticalAlign: "middle",
}

const inviteIconText: React.CSSProperties = {
  fontSize: "15px",
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

const strongAuthor: React.CSSProperties = {
  color: "#555555",
  fontWeight: 500,
}

const detailsCardCell: React.CSSProperties = {
  backgroundColor: "#fafafa",
  border: "1px solid #e9e9e9",
  borderRadius: "7px",
  padding: "15px",
}

const labelStyle: React.CSSProperties = {
  color: "#8a8a8a",
  fontSize: "10px",
  lineHeight: "15px",
  fontWeight: 500,
  letterSpacing: "0.01em",
}

const valueStyle: React.CSSProperties = {
  color: "#1b1b1b",
  fontSize: "13px",
  lineHeight: "19px",
  fontWeight: 500,
  marginTop: "3px",
}

const valueEmailStyle: React.CSSProperties = {
  color: "#1b1b1b",
  fontSize: "13px",
  lineHeight: "19px",
  fontWeight: 500,
  marginTop: "3px",
  wordBreak: "break-word" as const,
}

const roleBadgeStyle: React.CSSProperties = {
  display: "inline-block",
  backgroundColor: "#e4f0ff",
  color: "#2f86e8",
  borderRadius: "4px",
  padding: "3px 7px",
  fontSize: "10px",
  lineHeight: "14px",
  fontWeight: 500,
  whiteSpace: "nowrap" as const,
}

const detailsDividerStyle: React.CSSProperties = {
  borderTop: "1px solid #ededed",
  height: "1px",
  fontSize: "1px",
  lineHeight: "1px",
}

/**
 * Product actual black (#161616 / #111111 family) button style
 */
const buttonStyle: React.CSSProperties = {
  display: "inline-block",
  backgroundColor: "#161616",
  border: "1px solid #161616",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "12px",
  lineHeight: "18px",
  fontWeight: 500,
  padding: "9px 14px",
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
