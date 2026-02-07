import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
  Section,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface VerificationEmailProps {
  supabase_url: string
  email_action_type: string
  redirect_to: string
  token_hash: string
  token: string
}

export const VerificationEmail = ({
  token,
  supabase_url,
  email_action_type,
  redirect_to,
  token_hash,
}: VerificationEmailProps) => (
  <Html dir="rtl" lang="he">
    <Head />
    <Preview>אימות החשבון שלך - הענן שלי</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img
            src="https://opwjthgdhyzzwfclowtv.supabase.co/storage/v1/object/public/email-assets/logo.jpg?v=1"
            alt="הענן שלי"
            width="80"
            height="80"
            style={logo}
          />
        </Section>
        
        <Heading style={h1}>ברוכים הבאים להענן שלי! ☁️</Heading>
        
        <Text style={text}>
          תודה שנרשמת לפלטפורמת הוידאו שלנו. כדי להשלים את ההרשמה ולהתחיל להשתמש בשירות, אנא אמת את כתובת המייל שלך.
        </Text>
        
        <Section style={buttonContainer}>
          <Link
            href={`${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`}
            target="_blank"
            style={button}
          >
            אמת את החשבון שלי
          </Link>
        </Section>
        
        <Text style={text}>
          או העתק את קוד האימות הזמני:
        </Text>
        
        <code style={code}>{token}</code>
        
        <Text style={footerText}>
          אם לא נרשמת לשירות שלנו, אתה יכול להתעלם מהמייל הזה בבטחה.
        </Text>
        
        <Section style={footer}>
          <Text style={footerBrand}>
            הענן שלי © 2026
          </Text>
          <Text style={footerLinks}>
            <Link href="https://discord.gg/H4M5mufS" style={footerLink}>
              צור קשר
            </Link>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default VerificationEmail

const main = {
  backgroundColor: '#0c1929',
  fontFamily: 'Arial, sans-serif',
}

const container = {
  padding: '40px 20px',
  margin: '0 auto',
  maxWidth: '560px',
}

const logoSection = {
  textAlign: 'center' as const,
  marginBottom: '24px',
}

const logo = {
  borderRadius: '12px',
  margin: '0 auto',
}

const h1 = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  margin: '24px 0',
}

const text = {
  color: '#94a3b8',
  fontSize: '16px',
  lineHeight: '26px',
  textAlign: 'center' as const,
  margin: '16px 0',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#0891b2',
  borderRadius: '8px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: 'bold',
  padding: '14px 32px',
  textDecoration: 'none',
}

const code = {
  display: 'block',
  padding: '16px',
  width: '100%',
  backgroundColor: '#1e293b',
  borderRadius: '8px',
  border: '1px solid #334155',
  color: '#0891b2',
  fontSize: '24px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  letterSpacing: '4px',
  margin: '16px 0',
}

const footerText = {
  color: '#64748b',
  fontSize: '14px',
  textAlign: 'center' as const,
  margin: '32px 0 16px',
}

const footer = {
  borderTop: '1px solid #1e293b',
  marginTop: '32px',
  paddingTop: '24px',
  textAlign: 'center' as const,
}

const footerBrand = {
  color: '#64748b',
  fontSize: '14px',
  margin: '0 0 8px',
}

const footerLinks = {
  margin: '0',
}

const footerLink = {
  color: '#0891b2',
  fontSize: '14px',
  textDecoration: 'none',
}
