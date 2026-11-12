import 'dotenv/config';
import mongoose from 'mongoose';
import User from './models/User';
import City from './models/City';
import Restaurant from './models/Restaurant';
import Category from './models/Category';
import Items from './models/Items';
import { GlobalUtilis } from './Utilis/GlobalUtilis';

async function seed() {
    const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASS, MONGO_URI } = process.env;
    if (!MONGO_URI || !ADMIN_EMAIL || !ADMIN_PASS || ADMIN_PASS.length < 8) {
        throw new Error('Set MONGO_URI, ADMIN_EMAIL and ADMIN_PASS (8+ characters) in .env');
    }
    await mongoose.connect(MONGO_URI);

    const email = ADMIN_EMAIL.toLowerCase();
    if (await User.exists({ email })) {
        console.log(`Admin ${email} already exists`);
    } else {
        await User.create({
            name: ADMIN_NAME || 'Admin', email, password: await GlobalUtilis.hashPassword(ADMIN_PASS),
            type: 'admin', verified: true,
        });
        console.log(`Admin ${email} created`);
    }

    if (process.argv.includes('--demo')) {
        const city = await City.findOneAndUpdate(
            { name: 'Cairo' }, { name: 'Cairo', lat: 30.0444, lon: 31.2357 }, { upsert: true, new: true },
        );
        const ownerEmail = 'demo-restaurant@example.com';
        let owner = await User.findOne({ email: ownerEmail });
        owner ??= await User.create({
            name: 'Demo Kitchen', email: ownerEmail, password: await GlobalUtilis.hashPassword(ADMIN_PASS),
            type: 'restaurant', verified: true,
        });
        let restaurant = await Restaurant.findOne({ user_id: owner._id });
        if (!restaurant) {
            restaurant = await Restaurant.create({
                user_id: owner._id, city_id: city._id, name: 'Demo Kitchen', address: 'Tahrir Square, Cairo',
                location: { type: 'Point', coordinates: [31.2357, 30.0444] }, cuisines: ['Egyptian', 'Drinks'],
                opening_time: '09:00', closing_time: '23:00', delivery_time: '30 min', delivery_fee: 15,
            });
            const [main, drinks] = await Category.insertMany([
                { restaurant_id: restaurant._id, name: 'Egyptian' },
                { restaurant_id: restaurant._id, name: 'Drinks' },
            ]);
            await Items.insertMany([
                { restaurant_id: restaurant._id, category_id: main._id, name: 'Koshary', price: 55, vegetarian: true, cover: 'src/uploads/ItemsImg/demo.png' },
                { restaurant_id: restaurant._id, category_id: main._id, name: 'Hawawshi', price: 80, vegetarian: false, cover: 'src/uploads/ItemsImg/demo.png' },
                { restaurant_id: restaurant._id, category_id: drinks._id, name: 'Sugarcane juice', price: 20, vegetarian: true, cover: 'src/uploads/ItemsImg/demo.png' },
            ]);
        }
        console.log(`Demo data ready: restaurant ${restaurant._id} in ${city.name}`);
    }
}

seed()
    .catch((err) => {
        console.error(err.message);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
