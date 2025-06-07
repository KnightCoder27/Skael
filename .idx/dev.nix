# To learn more about how to use Nix to configure your environment
# see: https://firebase.google.com/docs/studio/customize-workspace
{pkgs}: {
  # Which nixpkgs channel to use.
  channel = "stable-24.11"; # or "unstable"
  # Use https://search.nixos.org/packages to find packages
  packages = [
    pkgs.nodejs_20
    pkgs.zulu
    pkgs.python312
    pkgs.python312Packages.pip
    pkgs.python312Packages.uvicorn
    pkgs.python312Packages.fastapi
    pkgs.python312Packages.pandas
    pkgs.python312Packages.passlib
    pkgs.python312Packages.requests
  ];
  # Sets environment variables in the workspace
  env = {
    DATABASE_URL= "postgresql://neondb_owner:npg_BULoiEYlyJ09@ep-black-resonance-a10pilnk-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
  };
  # This adds a file watcher to startup the firebase emulators. The emulators will only start if
  # a firebase.json file is written into the user's directory
  services.firebase.emulators = {
    detect = true;
    projectId = "demo-app";
    services = ["auth" "firestore"];
  };
  idx = {
    # Search for the extensions you want on https://open-vsx.org/ and use "publisher.id"
    extensions = [
      # "vscodevim.vim"
      "ms-python.debugpy"
      "ms-python.python"
    ];
    workspace = {
      onCreate = {

        setup-env = ''
          echo "Running setup-env script..."
          # Set DB_PASSWORD explicitly for the script
          export DB_PASSWORD="$DB_PASSWORD"

          # Create virtual environment
          python -m venv .venv
          . .venv/bin/activate
          pip install --upgrade pip
          pip install psycopg2
          pip install pandas
          pip install fastapi
          pip install uvicorn
          pip install passlib
          pip install requests

          echo "Project Setup Completed"
        '';

        setupPython = "
          echo 'Running setupPython script...'
          python -m venv .venv
          source .venv/bin/activate
          pip install fastapi uvicorn pydantic pandas requests passlib
        ";
        default.openFiles = [
          "src/app/page.tsx"
        ];
      };
    
      onStart = {
        "activate-venv" = ''
          echo "Activating virtual environment..."
          source .venv/bin/activate
          # pip install --upgrade pip
          # pip install fastapi uvicorn pydantic pandas requests passlib sqlalchemy 
          # pip install psycopg2-binary firebase-admin dotenv python-multipart openpyxl
        '';
      };


    };
    # Enable previews and customize configuration
    previews = {
      enable = true;
      previews = {
        web = {
          command = ["npm" "run" "dev" "--" "--port" "$PORT" "--hostname" "0.0.0.0"];
          # command = ["npm" "run" "dev" "--" "--port" "5000" "--hostname" "0.0.0.0"];
          manager = "web";
        };
        
        # web = { # Add this new preview configuration
        #   command = ["uvicorn" "src.backend.main:app" "--host" "0.0.0.0" "--port" "8080"]; # Assuming your main file is main.py and app is the FastAPI instance
        #   manager = "web"; # Or "web-https" if you need HTTPS
        # };

      };
    };
  };
}
