import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";

export async function GET(request: NextRequest) {
  try {
    console.log("📊 Analytics API called");
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "today";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    console.log("📊 Period:", period, "Start:", startDateParam, "End:", endDateParam);

    // Calculate date range
    let startDate: Date;
    let endDate: Date = new Date();
    endDate.setHours(23, 59, 59, 999);

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
      endDate.setHours(23, 59, 59, 999);
    } else {
      switch (period) {
        case "today":
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          startDate.setHours(0, 0, 0, 0);
          break;
        case "month":
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 1);
          startDate.setHours(0, 0, 0, 0);
          break;
        case "year":
          startDate = new Date();
          startDate.setFullYear(startDate.getFullYear() - 1);
          startDate.setHours(0, 0, 0, 0);
          break;
        default:
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
      }
    }

    // Fetch Orders using client SDK
    const ordersRef = collection(db, "orders");
    const ordersQuery = query(ordersRef, orderBy("createdAt", "desc"));
    const ordersSnapshot = await getDocs(ordersQuery);
    
    // Filter orders by date range in memory
    const allOrders = ordersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    const orders = allOrders.filter((order: any) => {
      const orderDate = order.createdAt?.toDate
        ? order.createdAt.toDate()
        : new Date(order.createdAt);
      return orderDate >= startDate && orderDate <= endDate;
    });

    // Fetch Products using client SDK
    const productsRef = collection(db, "products");
    const productsQuery = query(productsRef);
    const productsSnapshot = await getDocs(productsQuery);
    const products = productsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Fetch Customers using client SDK
    const customersRef = collection(db, "customers");
    const customersQuery = query(customersRef);
    const customersSnapshot = await getDocs(customersQuery);
    const customers = customersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Fetch Reservations - without composite index requirement
    const reservationsRef = collection(db, "reservations");
    const reservationsSnapshot = await getDocs(reservationsRef);
    
    // Filter reservations by date range in memory
    const allReservations = reservationsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    const reservations = allReservations.filter((reservation: any) => {
      const resDate = reservation.createdAt?.toDate
        ? reservation.createdAt.toDate()
        : new Date(reservation.createdAt);
      return resDate >= startDate && resDate <= endDate;
    });

    // Fetch Contact Messages - without composite index requirement
    const messagesRef = collection(db, "contact_messages");
    const messagesSnapshot = await getDocs(messagesRef);
    
    // Filter messages by date range in memory
    const allMessages = messagesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    const messages = allMessages.filter((message: any) => {
      const msgDate = message.createdAt?.toDate
        ? message.createdAt.toDate()
        : new Date(message.createdAt);
      return msgDate >= startDate && msgDate <= endDate;
    });

    // Calculate Orders Statistics
    const totalRevenue = orders.reduce((sum: number, order: any) => {
      return sum + (order.total || 0);
    }, 0);

    const completedOrders = orders.filter(
      (order: any) => order.status === "completed"
    );
    const pendingOrders = orders.filter(
      (order: any) => order.status === "pending"
    );
    const cancelledOrders = orders.filter(
      (order: any) => order.status === "cancelled"
    );

    const averageOrderValue =
      orders.length > 0 ? totalRevenue / orders.length : 0;

    // Calculate unique customers from orders
    const uniqueCustomerEmails = new Set(
      orders.map((order: any) => order.customerInfo?.email).filter(Boolean)
    );

    // Product Performance
    const productSales: { [key: string]: { quantity: number; revenue: number; name: string; category: string } } = {};
    
    orders.forEach((order: any) => {
      order.items?.forEach((item: any) => {
        if (!productSales[item.id]) {
          productSales[item.id] = {
            quantity: 0,
            revenue: 0,
            name: item.name || "Unknown",
            category: item.category || "Uncategorized",
          };
        }
        productSales[item.id].quantity += item.quantity || 0;
        productSales[item.id].revenue += item.totalPrice || 0;
      });
    });

    const topProducts = Object.entries(productSales)
      .map(([id, data]) => ({
        id,
        ...data,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Category Performance
    const categorySales: { [key: string]: { orders: number; revenue: number } } = {};
    
    orders.forEach((order: any) => {
      order.items?.forEach((item: any) => {
        const category = item.category || "Uncategorized";
        if (!categorySales[category]) {
          categorySales[category] = { orders: 0, revenue: 0 };
        }
        categorySales[category].orders += 1;
        categorySales[category].revenue += item.totalPrice || 0;
      });
    });

    const totalCategoryRevenue = Object.values(categorySales).reduce(
      (sum, cat) => sum + cat.revenue,
      0
    );

    const categoryStats = Object.entries(categorySales)
      .map(([name, data]) => ({
        name,
        ...data,
        percentage:
          totalCategoryRevenue > 0
            ? (data.revenue / totalCategoryRevenue) * 100
            : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Reservations Statistics
    const confirmedReservations = reservations.filter(
      (r: any) => r.status === "confirmed"
    );
    const pendingReservations = reservations.filter(
      (r: any) => r.status === "pending"
    );
    const totalGuests = reservations.reduce(
      (sum: number, r: any) => sum + (r.guests || r.numberOfPeople || 0),
      0
    );

    // Messages Statistics
    const newMessages = messages.filter((m: any) => m.status === "new");
    const repliedMessages = messages.filter((m: any) => m.status === "replied");

    // Orders by day (for charts)
    const ordersByDay: { [key: string]: { count: number; revenue: number } } = {};
    
    orders.forEach((order: any) => {
      const date = order.createdAt?.toDate
        ? order.createdAt.toDate()
        : new Date(order.createdAt);
      const dateKey = date.toISOString().split("T")[0];
      
      if (!ordersByDay[dateKey]) {
        ordersByDay[dateKey] = { count: 0, revenue: 0 };
      }
      ordersByDay[dateKey].count += 1;
      ordersByDay[dateKey].revenue += order.total || 0;
    });

    const dailyStats = Object.entries(ordersByDay)
      .map(([date, data]) => ({
        date,
        ...data,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Orders by hour (for peak hours analysis)
    const ordersByHour: { [key: number]: number } = {};
    
    orders.forEach((order: any) => {
      const date = order.createdAt?.toDate
        ? order.createdAt.toDate()
        : new Date(order.createdAt);
      const hour = date.getHours();
      ordersByHour[hour] = (ordersByHour[hour] || 0) + 1;
    });

    const hourlyStats = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: ordersByHour[hour] || 0,
    }));

    // Payment methods statistics
    const paymentMethods: { [key: string]: number } = {};
    
    orders.forEach((order: any) => {
      const method = order.paymentMethod || "cash";
      paymentMethods[method] = (paymentMethods[method] || 0) + 1;
    });

    const paymentStats = Object.entries(paymentMethods).map(([method, count]) => ({
      method,
      count,
      percentage: orders.length > 0 ? (count / orders.length) * 100 : 0,
    }));

    return NextResponse.json({
      success: true,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        label: period,
      },
      overview: {
        totalRevenue,
        totalOrders: orders.length,
        completedOrders: completedOrders.length,
        pendingOrders: pendingOrders.length,
        cancelledOrders: cancelledOrders.length,
        averageOrderValue,
        uniqueCustomers: uniqueCustomerEmails.size,
        totalCustomers: customers.length,
      },
      products: {
        total: products.length,
        active: products.filter((p: any) => p.status === "active").length,
        topSelling: topProducts,
      },
      categories: categoryStats,
      reservations: {
        total: reservations.length,
        confirmed: confirmedReservations.length,
        pending: pendingReservations.length,
        totalGuests,
      },
      messages: {
        total: messages.length,
        new: newMessages.length,
        replied: repliedMessages.length,
      },
      charts: {
        daily: dailyStats,
        hourly: hourlyStats,
        payments: paymentStats,
      },
      recentOrders: orders.slice(0, 10),
    });
  } catch (error: any) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch analytics data",
      },
      { status: 500 }
    );
  }
}
