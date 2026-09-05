import app from '../server/src/app.js'
import 'dotenv/config';

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});