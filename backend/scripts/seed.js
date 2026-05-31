import "dotenv/config";
import mongoose from "mongoose";
import { format, subDays } from "date-fns";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";
import Habit from "../models/Habit.js";
import HabitLog from "../models/HabitLog.js";
import AIInsight from "../models/AIInsight.js";

const EMAIL="dummy@email.com";
const PASSWORD="dummy123";
const NAME="Dummy";

const HABITS = [
  {
    name: "Morning run",
    description: "30 min jog before breakfast",
    category: "Fitness",
    frequency: "daily",
    targetDays: 7,
    color: "#22c55e",
    icon: "🏃",
    _streakProb: 0.85,
    _pattern: "weekdays",
  },
  {
    name: "Read 20 pages",
    description: "Any book, fiction or non-fiction",
    category: "Learning",
    frequency: "daily",
    targetDays: 7,
    color: "#6366f1",
    icon: "📚",
    _streakProb: 0.72,
    _pattern: "dropoff",
    _brokeAt: 18,
  },
  {
    name: "Meditate",
    description: "10 minutes mindfulness",
    category: "Mindfulness",
    frequency: "daily",
    targetDays: 7,
    color: "#a855f7",
    icon: "🧘",
    _streakProb: 0.58,
    _pattern: "dropoff",
    _brokeAt: 6,
  },
  {
    name: "Drink 2L water",
    description: "Track hydration through the day",
    category: "Health",
    frequency: "daily",
    targetDays: 7,
    color: "#0ea5e9",
    icon: "💧",
    _streakProb: 0.92,
    _pattern: "daily",
  },
  {
    name: "No social media",
    description: "Avoid Instagram and X before 10am",
    category: "Mindfulness",
    frequency: "weekly",
    targetDays: 5,
    color: "#f97316",
    icon: "📵",
    _streakProb: 0.48,
    _pattern: "weekdays",
    _brokeAt: 25,
  },
  {
    name: "Journaling",
    description: "Write 5 minutes before bed",
    category: "Mindfulness",
    frequency: "daily",
    targetDays: 7,
    color: "#ec4899",
    icon: "✍️",
    _streakProb: 0.38,
    _pattern: "dropoff",
  },
  {
    name: "Gym session",
    description: "Strength training",
    category: "Fitness",
    frequency: "weekly",
    targetDays: 3,
    color: "#f43f5e",
    icon: "🏋️",
    _streakProb: 0.68,
    _pattern: "weekdays",
    _brokeAt: 10,
  },
  {
    name: "Sleep by 11pm",
    description: "",
    category: "Health",
    frequency: "daily",
    targetDays: 7,
    color: "#14b8a6",
    icon: "😴",
    _streakProb: 0.52,
    _pattern: "daily",
  },
];
const todayKey = () => format(new Date(), "yyyy-MM-dd");

const buildLogs = (habit, totalDays = 90) => {
    const logs = [];
    const today = new Date();
    for( let i=0; i< totalDays; i++){
        const d= subDays(today, i);
        const dow = d.getDay();
        const key = format(d, "yyyy-MM-dd");
        let p = habit._streakProb;
        if(habit._pattern === "weekdays" && (dow === 0 || dow === 6)){
            p = 0.35;
        }
        if(habit._pattern === "dropoff" ){
            if(i<14) p+=0.25;
        }
        if(habit._brokeAt && i>= habit._brokeAt -2 && i<= habit._brokeAt +2){
            continue;
        }
        const seed = Math.sin(i*9301 + habit.name.length * 49297) * 233280;
        const rnd= seed - Math.floor(seed);
        if(rnd < p){
            logs.push({ completedDate: key });
        }
    }
    return logs;
};

const run = async () => {
    await connectDB();
    
    let user = await User.findOne({ email: EMAIL });
    if (user) {
        console.log(`Found user ${EMAIL}, deleting existing data...`);
        await Habit.deleteMany({ userId: user._id });
        await HabitLog.deleteMany({ userId: user._id });
        await AIInsight.deleteMany({ userId: user._id });
        user.name = NAME;
        user.avatar=NAME.charAt(0).toUpperCase();
        user.morningMotivation= true;
        user.password = PASSWORD;
        await user.save();
    } else {
        user = await User.create({
            name: NAME,
            email: EMAIL,
            password: PASSWORD,
            avatar: NAME.charAt(0).toUpperCase(),
            morningMotivation: true,
        });
        console.log(`Created user ${EMAIL}`);
    }
    const createdHabits = [];
    for (let i = 0; i < HABITS.length; i++) {
        const h= HABITS[i];
        const habit = await Habit.create({
            userId: user._id,
            name: h.name,
            description: h.description,
            category: h.category,
            frequency: h.frequency,
            targetDays: h.targetDays,
            color: h.color,
            icon: h.icon,
            order: i,
            createdAt: subDays(new Date(),89),
            updatedAt: subDays(new Date(),89),
        });
        habit.createdAt = subDays(new Date(),89);
        await habit.save({timestamps: false});
        createdHabits.push({habit, config: h});
    }

    let totalLogs = 0;
    for (const {habit, config} of createdHabits) {
        const logs = buildLogs(config);
        if(!logs.length) continue;
        const docs = logs.map((l) => ({ 
            userId: user._id,
            habitId: habit._id,
            completedDate: l.completedDate,
         }));
        await HabitLog.insertMany(docs, { ordered: false }).catch(() => {});
        totalLogs += docs.length;
    }
    const today = todayKey();
    const todayDoneHabits= createdHabits.slice(0,4).map((c) => c.habit);
    for(const h of todayDoneHabits){
        await HabitLog.updateOne({ 
            userId: user._id, habitId: h._id, completedDate: today },
            { $setOnInsert: { userId: user._id, habitId: h._id, completedDate: today } },
            { upsert: true }
        );
    }
    console.log(`\nSeed Complete`);
    console.log(`User: ${EMAIL} `);
    console.log(`Password: ${PASSWORD}`);
    console.log(`Habits: ${createdHabits.length} `);
    console.log(`Logs: ~${totalLogs} `);
    await mongoose.disconnect();
};

run().catch(async(err) => {
    console.error("Error seeding data:", err);
    await mongoose.disconnect();
    process.exit(1);
});