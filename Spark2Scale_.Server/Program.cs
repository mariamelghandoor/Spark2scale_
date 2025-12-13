using Supabase;
using DotNetEnv;
using Spark2Scale_.Server.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using System;

// Load .env
Env.Load();

var builder = WebApplication.CreateBuilder(args);

// Define a policy name for CORS
var MyAllowSpecificOrigins = "_myAllowSpecificOrigins";

// --- START CORS FIX (1 of 2) ---
builder.Services.AddCors(options =>
{
    options.AddPolicy(name: MyAllowSpecificOrigins,
        policy =>
        {
            // Allow requests from your frontend port (3000). Adjust if your frontend is on a different port.
            policy.WithOrigins("http://localhost:3000", "https://localhost:3000")
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});
// --- END CORS FIX ---


// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// REGISTER CUSTOM SERVICES:
builder.Services.AddTransient<EmailService>();

// 2. Get keys from Environment Variables (Loaded from .env)
var url = Environment.GetEnvironmentVariable("SUPABASE_URL");
var key = Environment.GetEnvironmentVariable("SUPABASE_KEY");

// >>> CRITICAL FIX: Add check for missing environment variables <<<
if (string.IsNullOrEmpty(url) || string.IsNullOrEmpty(key))
{
    Console.WriteLine("FATAL ERROR: SUPABASE_URL or SUPABASE_KEY is missing.");
    throw new InvalidOperationException("Supabase credentials must be set in the .env file for the backend to start.");
}
// >>> END CRITICAL FIX <<<


// 3. Configure and Initialize Supabase
var options = new SupabaseOptions
{
    AutoRefreshToken = true,
    AutoConnectRealtime = false  // Disable to prevent startup failures if realtime can't connect
};

// Create the client instance using the checked variables
var supabase = new Supabase.Client(url, key, options);

// Await initialization (Important: Ensures connection works before app starts)
try
{
    await supabase.InitializeAsync();
}
catch (Exception ex)
{
    Console.WriteLine($"FATAL ERROR during Supabase initialization: {ex.Message}");
    throw new InvalidOperationException("Failed to initialize Supabase client. Check connection settings and network.", ex);
}

// Single shared Supabase client
builder.Services.AddSingleton(supabase);
var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// --- APPLY CORS MIDDLEWARE (2 of 2) ---
app.UseCors(MyAllowSpecificOrigins);
// --- END CORS MIDDLEWARE ---

app.UseAuthorization();
app.MapControllers();

app.Run();
