using Supabase;

// 1. Load the .env file
DotNetEnv.Env.Load();

var builder = WebApplication.CreateBuilder(args);

////////////// Allow CORS for linking front end with backend //////////////

var MyAllowSpecificOrigins = "_myAllowSpecificOrigins";
builder.Services.AddCors(options =>
{
    options.AddPolicy(name: MyAllowSpecificOrigins,
                      policy =>
                      {
                          // Replace with your React URL (e.g., http://localhost:5173 or http://localhost:3000)
                          // Or use .AllowAnyOrigin() for development only
                          policy.WithOrigins("http://localhost:5173", "http://localhost:3000")
                                .AllowAnyHeader()
                                .AllowAnyMethod();
                      });
});

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// 2. Get keys from Environment Variables (Loaded from .env)
var url = Environment.GetEnvironmentVariable("SUPABASE_URL");
var key = Environment.GetEnvironmentVariable("SUPABASE_KEY");

// 3. Configure and Initialize Supabase
var options = new SupabaseOptions
{
    AutoRefreshToken = true,
    AutoConnectRealtime = true
};

// Create the client instance explicitly
var supabase = new Supabase.Client(url!, key!, options);

// Await initialization (Important: Ensures connection works before app starts)
await supabase.InitializeAsync();

// Register as Singleton (One instance for the whole app)
builder.Services.AddSingleton(supabase);

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();


////////////// Allow CORS for linking front end with backend //////////////
app.UseCors(MyAllowSpecificOrigins);

app.UseAuthorization();

app.MapControllers();
app.MapFallbackToFile("/index.html");

app.Run();