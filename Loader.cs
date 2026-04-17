using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Reflection;

class Loader {
    [STAThread]
    static void Main() {
        try {
            string tempBase = Path.Combine(Path.GetTempPath(), "DistinctionRP");
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

            string targetExe = Path.Combine(tempBase, "Distinction RP Launcher.exe");
            ProcessStartInfo psi = new ProcessStartInfo(targetExe);
            psi.WorkingDirectory = tempBase;
            Process.Start(psi);
        } catch (Exception ex) {
            System.Windows.Forms.MessageBox.Show("Erreur au lancement : " + ex.Message);
        }
    }
}
