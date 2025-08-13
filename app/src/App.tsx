import './App.css'
import { Box, Button, Container, Divider, Stack, Typography } from '@mui/material'

function App() {
  return (
    <Container maxWidth="md">
      <Stack spacing={3} sx={{ py: 6 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            מערכת תזמון לצוות גן
          </Typography>
          <Typography color="text.secondary">
            אפליקציה לתזמון מטפלים וחדרים בימים ראשון עד חמישי. ממשק בעברית, כיוון ימין לשמאל.
          </Typography>
        </Box>
        <Divider />
        <Stack direction="row" spacing={2}>
          <Button variant="contained">צור לוח זמנים</Button>
          <Button variant="outlined">ניהול עובדים</Button>
          <Button variant="outlined">ניהול חדרים</Button>
          <Button variant="text">הגדרות</Button>
        </Stack>
      </Stack>
    </Container>
  )
}

export default App
