import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Booking from "@/lib/models/Booking";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone } = body;

    // Basic validation
    if (!name || !email || !phone) {
      return NextResponse.json(
        { success: false, message: "All fields are required" },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    await dbConnect();

    // Create new booking document
    const booking = await Booking.create({ name, email, phone });

    return NextResponse.json(
      {
        success: true,
        message: "Booking saved successfully",
        data: { id: booking._id },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Booking API error:", error);

    // Handle Mongoose validation errors
    if (error instanceof Error && error.name === "ValidationError") {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await dbConnect();
    const bookings = await Booking.find({}).sort({ createdAt: -1 }).lean();

    return NextResponse.json(
      { success: true, data: bookings },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Fetch bookings error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
