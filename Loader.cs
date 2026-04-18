using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Runtime.InteropServices;

[assembly: AssemblyTitle("Distinction Roleplay Launcher")]
[assembly: AssemblyDescription("Launcher officiel du serveur Distinction RP")]
[assembly: AssemblyConfiguration("")]
[assembly: AssemblyCompany("Distinction RP")]
[assembly: AssemblyProduct("Distinction RP")]
[assembly: AssemblyCopyright("Copyright © Distinction RP 2024")]
[assembly: AssemblyTrademark("Distinction RP")]
[assembly: AssemblyCulture("")]
[assembly: AssemblyVersion("1.0.0.0")]
[assembly: AssemblyFileVersion("1.0.0.0")]

class Loader {
    [STAThread]
    static void Main() {
        try {
            // Utiliser un nouveau nom pour forcer Windows a oublier le cache (Icone + Nom)
            string tempBase = Path.Combine(Path.GetTempPath(), "DistinctionRP_Release");
            if (Directory.Exists(tempBase)) {
                try { Directory.Delete(tempBase, true); } catch {}
            }
            Directory.CreateDirectory(tempBase);

            // Load ZIP from resources
            Assembly assembly = Assembly.GetExecutingAssembly();
            using (Stream stream = assembly.GetManifestResourceStream("payload.zip")) {
                if (stream == null) return;
                string zipPath = Path.Combine(tempBase, "app.zip");
                using (FileStream fs = File.Create(zipPath)) {
                    stream.CopyTo(fs);
                }
                
                ZipFile.ExtractToDirectory(zipPath, tempBase);
                File.Delete(zipPath);
            }

            string targetExe = Path.Combine(tempBase, "DISTINCTION RP.exe");
            if (!File.Exists(targetExe)) {
                string[] files = Directory.GetFiles(tempBase, "*.exe");
                if (files.Length > 0) targetExe = files[0];
            }
            string originalExePath = "\"" + Assembly.GetExecutingAssembly().Location + "\"";
            ProcessStartInfo psi = new ProcessStartInfo(targetExe, originalExePath);
            psi.WorkingDirectory = tempBase;
            Process.Start(psi);
        } catch (Exception ex) {
            System.Windows.Forms.MessageBox.Show("Erreur au lancement : " + ex.Message);
        }
    }
}
