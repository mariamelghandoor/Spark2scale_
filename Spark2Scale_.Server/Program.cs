using Supabase;
using DotNetEnv;
using Spark2Scale_.Server.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using System.Text.Json;
using System;


// Load .env
Env.Load();

var builder = WebApplication.CreateBuilder(args);

// CORS policy name
builder.Services.AddHttpClient();
var MyAllowSpecificOrigins = "_myAllowSpecificOrigins";

// CORS – allow Next.js dev server
builder.Services.AddCors(options =>
{
    options.AddPolicy(name: MyAllowSpecificOrigins, policy =>
    {
        // Allow any localhost port (fixing the issue if frontend is on 3001, 3002 etc)
        policy.SetIsOriginAllowed(origin => new Uri(origin).Host == "localhost")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Configure JSON to accept both camelCase and PascalCase
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Accept both camelCase (from frontend) and PascalCase (C# default)
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
        options.JsonSerializerOptions.PropertyNamingPolicy = null; // Keep PascalCase
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Email sender service (uses SMTP settings in your env)
builder.Services.AddTransient<EmailService>();
builder.Services.AddTransient<AccessControlService>();

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

// --- FIX: Apply CORS *BEFORE* other middleware like Swagger or Auth ---
app.UseCors(MyAllowSpecificOrigins);

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// app.UseHttpsRedirection(); // Keep commented out to avoid redirect loops on localhost

app.UseAuthorization();

app.MapControllers();

app.Run();