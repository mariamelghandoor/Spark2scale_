using Supabase;
using DotNetEnv;
using Spark2Scale_.Server.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using System.Text.Json;
using System;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerUI;


// 1. Load environment variables
DotNetEnv.Env.Load();

var builder = WebApplication.CreateBuilder(args);

// 2. CORS configuration
var MyAllowSpecificOrigins = "_myAllowSpecificOrigins";
builder.Services.AddCors(options =>
{
    options.AddPolicy(name: MyAllowSpecificOrigins, policy =>
    {
        policy.SetIsOriginAllowed(origin => new Uri(origin).Host == "localhost" || origin.Contains("azurestaticapps.net"))
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // <-- ADDED THIS LINE: Required for frontend credentials/cookies
    });
});

// 3. Controllers and JSON
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
        options.JsonSerializerOptions.PropertyNamingPolicy = null;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpClient();

// 4. Custom Services
builder.Services.AddTransient<EmailService>();
builder.Services.AddTransient<AccessControlService>();

// 5. Supabase Configuration
var url = Environment.GetEnvironmentVariable("SUPABASE_URL") ?? builder.Configuration["SUPABASE_URL"];
var key = Environment.GetEnvironmentVariable("SUPABASE_KEY") ?? builder.Configuration["SUPABASE_KEY"];

if (string.IsNullOrEmpty(url) || string.IsNullOrEmpty(key))
{
    Console.WriteLine("FATAL: SUPABASE_URL or SUPABASE_KEY missing.");
    throw new InvalidOperationException("Supabase credentials must be set.");
}

var supabaseOptions = new SupabaseOptions
{
    AutoRefreshToken = true,
    AutoConnectRealtime = true
};

var supabaseClient = new Supabase.Client(url, key, supabaseOptions);

// Initialize Supabase before the app starts
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

app.UseCors(MyAllowSpecificOrigins);

if (app.Environment.IsDevelopment() || app.Environment.IsProduction())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "v1");
        options.RoutePrefix = "swagger";
    });
}

app.UseAuthorization();
app.MapControllers();

app.Run();