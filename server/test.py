import boto3
import dotenv
import os

dotenv.load_dotenv()

print(boto3.__version__)

def main():
    access_key = os.getenv("R2_ACCESS_KEY_ID")
    secret_key = os.getenv("R2_SECRET_ACCESS_KEY")
    endpoint = os.getenv("R2_ENDPOINT")
    bucket = os.getenv("R2_BUCKET")
    prefix = ""

    if not all([access_key, secret_key, endpoint, bucket]):
        print("❌ Missing R2 configuration. Required: R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET")
        exit(1)
        
    # boto3 initialization
    session = boto3.session.Session()
    client = session.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name=os.getenv("R2_REGION", "auto"),
    )

    # Build list of existing local files to upload
    local_files = []
    for name in ["7d.json", "30d.json", "90d.json", "120d.json", "all.json", "meta.json"]:
        path = os.path.join(os.path.join(os.getcwd(), "heatmaps"), name)
        if os.path.isfile(path):
            local_files.append((name, path))
        else:
            print(f"⚠️  Heatmap file missing, skipping: {path}")

    if not local_files:
        print("❌ No heatmap files found to upload.")
        return False

    # Delete previous objects (same keys) from R2
    keys_to_delete = [{"Key": f"{prefix}{name}"} for name, _ in local_files]
    try:
        client.delete_objects(Bucket=bucket, Delete={"Objects": keys_to_delete, "Quiet": True})
        print(f"🧹 Deleted {len(keys_to_delete)} previous heatmap objects from R2.")
    except Exception as e:
        print(f"❌ Failed to delete previous heatmap objects: {e}")
        return False

    # Upload updated files
    for name, path in local_files:
        key = f"{prefix}{name}"
        try:
            client.upload_file(
                path,
                bucket,
                key,
                ExtraArgs={"ContentType": "application/json"},
            )
            print(f"☁️  Uploaded: {key}")
        except Exception as e:
            print(f"❌ Failed to upload {path}: {e}")
            return False

    print("✅ R2 upload complete.")
    return True

if __name__ == "__main__":
    main()
