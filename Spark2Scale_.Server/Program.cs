using Supabase;
using DotNetEnv;
using Spark2Scale_.Server.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using System.Text.Json;
using System;

// Load .env for local development
Env.Load();

var builder = WebApplication.CreateBuilder(args);

// CORS policy name
var MyAllowSpecificOrigins = "_myAllowSpecificOrigins";

// CORS configuration
builder.Services.AddCors(options =>
{
    options.AddPolicy(name: MyAllowSpecificOrigins, policy =>
    {
        // Allows localhost for dev and your future Azure Static Web App URL
        policy.SetIsOriginAllowed(origin => new Uri(origin).Host == "localhost" || origin.Contains("azurestaticapps.net") || origin == Environment.GetEnvironmentVariable("CLIENT_URL"))
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Configure JSON options
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
        options.JsonSerializerOptions.PropertyNamingPolicy = null; 
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Services
builder.Services.AddTransient<EmailService>();
builder.Services.AddTransient<AccessControlService>();

// Supabase Configuration
// This will check your Azure Environment Variables first, then your .env file
var url = Environment.GetEnvironmentVariable("SUPABASE_URL") ?? builder.Configuration["SUPABASE_URL"];
var key = Environment.GetEnvironmentVariable("SUPABASE_KEY") ?? builder.Configuration["SUPABASE_KEY"];

if (string.IsNullOrEmpty(url) || string.IsNullOrEmpty(key))
{
    Console.WriteLine("FATAL: SUPABASE_URL or SUPABASE_KEY missing. Ensure they are set in Azure App Settings.");
    throw new InvalidOperationException("Supabase credentials must be set.");
}

var supabaseOptions = new SupabaseOptions
{
    AutoRefreshToken = true,
    AutoConnectRealtime = true
};

var supabaseClient = new Supabase.Client(url, key, supabaseOptions);

// Initialize Supabase
try
{
    await supabaseClient.InitializeAsync();
}
catch (Exception ex)
{
    Console.WriteLine($"FATAL Supabase init error: {ex.Message}");
    throw;
}

builder.Services.AddSingleton(supabaseClient);

var app = builder.Build();

// --- MIDDLEWARE PIPELINE ---

// Apply CORS before Swagger or Controllers
app.UseCors(MyAllowSpecificOrigins);

// FIXED: Swagger enabled for both Development and Production (Azure)
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "v1");
        options.RoutePrefix = "swagger"; // Access via /swagger
    });
}

app.UseAuthorization();
app.MapControllers();

app.Run();
