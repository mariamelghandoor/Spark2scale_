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

// CORS policy name
var MyAllowSpecificOrigins = "_myAllowSpecificOrigins";

// CORS – allow Next.js dev server
builder.Services.AddCors(options =>
{
    options.AddPolicy(name: MyAllowSpecificOrigins, policy =>
    {
        // Note: Using http and https covers you regardless of how you access localhost
        policy.WithOrigins("http://localhost:3000", "https://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Email sender service (uses SMTP settings in your env)
builder.Services.AddTransient<EmailService>();

// REMOVED: Duplicate builder.Services.AddControllers();

// Supabase URL + API key from environment
var url = Environment.GetEnvironmentVariable("SUPABASE_URL");
var key = Environment.GetEnvironmentVariable("SUPABASE_KEY");

if (string.IsNullOrEmpty(url) || string.IsNullOrEmpty(key))
{
    Console.WriteLine("FATAL: SUPABASE_URL or SUPABASE_KEY missing.");
    throw new InvalidOperationException("Supabase credentials must be set in .env");
}

var options = new SupabaseOptions
{
    AutoRefreshToken = true,
    AutoConnectRealtime = true
};

var supabaseClient = new Supabase.Client(url, key, options);

// Initialize client before app starts
try
{
    await supabaseClient.InitializeAsync();
}
catch (Exception ex)
{
    Console.WriteLine($"FATAL Supabase init error: {ex.Message}");
    throw;
}

// Single shared Supabase client
builder.Services.AddSingleton(supabaseClient);

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// --- FIX: Apply CORS before other middleware ---
app.UseCors(MyAllowSpecificOrigins);

// --- FIX: Comment out HTTPS Redirection to solve "Redirect not allowed" error ---
// app.UseHttpsRedirection(); 

app.UseAuthorization();

app.MapControllers();

app.Run();