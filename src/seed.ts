import 'dotenv/config';
import mongoose from 'mongoose';
import User from './models/User';
import City from './models/City';
import Restaurant from './models/Restaurant';
import Category from './models/Category';
import Items from './models/Items';
import { GlobalUtilis } from './Utilis/GlobalUtilis';

type DemoRestaurant = {
    owner: string;
    name: string;
    address: string;
    coordinates: [number, number];
    opening: string;
    closing: string;
    deliveryTime: string;
    fee: number;
    menu: Record<string, [string, number, boolean][]>;
};

const DEMO: DemoRestaurant[] = [
    {
        owner: 'demo-restaurant@example.com', name: 'Demo Kitchen', address: 'Tahrir Square, Cairo',
        coordinates: [31.2357, 30.0444], opening: '09:00', closing: '23:00', deliveryTime: '30 min', fee: 15,
        menu: {
            Egyptian: [['Koshary', 55, true], ['Hawawshi', 80, false], ['Fool sandwich', 15, true]],
            Drinks: [['Sugarcane juice', 20, true], ['Karkade', 18, true]],
        },
    },
    {
        owner: 'demo-burger@example.com', name: 'Burger Lab', address: 'Zamalek, 26th of July St',
        coordinates: [31.2219, 30.0626], opening: '12:00', closing: '02:00', deliveryTime: '25 min', fee: 0,
        menu: {
            Burgers: [['Classic smash', 145, false], ['Double cheese', 189, false], ['Mushroom swiss', 165, false]],
            Sides: [['Loaded fries', 75, true], ['Onion rings', 55, true]],
        },
    },
    {
        owner: 'demo-pizza@example.com', name: 'Forno Pizza', address: 'Garden City, Cairo',
        coordinates: [31.2318, 30.0365], opening: '11:00', closing: '00:00', deliveryTime: '35 min', fee: 20,
        menu: {
            Pizza: [['Margherita', 140, true], ['Pepperoni', 175, false], ['Four cheese', 185, true]],
            Desserts: [['Nutella pizza', 120, true]],
        },
    },
    {
        owner: 'demo-grill@example.com', name: 'Abu Hamza Grill', address: 'Dokki, Tahrir St',
        coordinates: [31.2109, 30.0384], opening: '13:00', closing: '01:00', deliveryTime: '40 min', fee: 10,
        menu: {
            Grills: [['Kofta kilo', 420, false], ['Mixed grill', 360, false], ['Chicken shish', 210, false]],
            Salads: [['Tahini', 20, true], ['Baba ghanoush', 25, true]],
        },
    },
];

async function seedDemo(password: string) {
    const city = await City.findOneAndUpdate(
        { name: 'Cairo' }, { name: 'Cairo', lat: 30.0444, lon: 31.2357 }, { upsert: true, new: true },
    );
    const hash = await GlobalUtilis.hashPassword(password);
    for (const d of DEMO) {
        let owner = await User.findOne({ email: d.owner });
        owner ??= await User.create({ name: d.name, email: d.owner, password: hash, type: 'restaurant', verified: true });
        if (await Restaurant.exists({ user_id: owner._id })) continue;
        const restaurant = await Restaurant.create({
            user_id: owner._id, city_id: city._id, name: d.name, address: d.address,
            location: { type: 'Point', coordinates: d.coordinates }, cuisines: Object.keys(d.menu),
            opening_time: d.opening, closing_time: d.closing, delivery_time: d.deliveryTime, delivery_fee: d.fee,
        });
        for (const [categoryName, dishes] of Object.entries(d.menu)) {
            const category = await Category.create({ restaurant_id: restaurant._id, name: categoryName });
            await Items.insertMany(dishes.map(([name, price, vegetarian]) => ({
                restaurant_id: restaurant._id, category_id: category._id, name, price, vegetarian,
                cover: 'src/uploads/ItemsImg/demo.png',
            })));
        }
    }
    console.log(`Demo data ready: ${DEMO.length} restaurants in ${city.name} (owners log in with ADMIN_PASS)`);
}

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

    if (process.argv.includes('--demo')) await seedDemo(ADMIN_PASS);
}

seed()
    .catch((err) => {
        console.error(err.message);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
