-- =============================================================================
-- Diagram Name: database
-- Created on: 2013-09-05 16:16:49
-- Diagram Version: 
-- =============================================================================


CREATE TABLE "images" (
	"iid" SERIAL NOT NULL,
	"fid" int4,
	"image_top" float4,
	"image_left" float4,
	"image_width" int4,
	"image_height" int4,
	"tile_width" int4,
	"tile_height" int4,
	"pixel_size" float4,
	"image_crc32" text,
	"image_md5" text,
	"invalid" text,
	"status" int4 NOT NULL DEFAULT 0,
	"bid" int4,
	"uid" int4,
	"filename" text,
	"source_filesize" int4,
	"source_crc32" text,
	"source_md5" text,
	"source_meta" text,
	"source_magick" text,
	"upload_start" timestamp DEFAULT now(),
	"upload_end" timestamp,
	"declared_size" int4,
	"public_image_view" bool NOT NULL DEFAULT False,
	"public_image_edit" bool NOT NULL DEFAULT False,
	"public_image_annotate" bool NOT NULL DEFAULT False,
	"public_image_outline" bool NOT NULL DEFAULT False,
	CONSTRAINT "images_pkey" PRIMARY KEY("iid")
)
WITH (
	OIDS = False
);


CREATE INDEX "images_image_crc32" ON "images" (
	"image_crc32"
);


CREATE INDEX "images_image_md5" ON "images" (
	"image_md5"
);


CREATE INDEX "images_image_hash" ON "images" (
	"image_crc32", 
	"image_md5"
);


CREATE INDEX "images_bid" ON "images" (
	"bid"
);


CREATE INDEX "images_uid" ON "images" (
	"uid"
);


CREATE INDEX "images_source_md5" ON "images" (
	"source_md5"
);


ALTER TABLE "images" OWNER TO "skwarki";GRANT ALL PRIVILEGES ON TABLE "images" TO "postgres";

GRANT SELECT, UPDATE, INSERT, DELETE ON TABLE "images" TO "skwarki";



CREATE TABLE "users" (
	"uid" SERIAL NOT NULL,
	"login" text NOT NULL,
	"salt" int4,
	"md5" text,
	"sha1" text,
	"bcrypt10" text,
	"sha224" text,
	"sha256" text,
	"sha384" text,
	"sha512" text,
	"email" text,
	"name" text,
	"confirmation_sent" timestamp,
	"registration_date" timestamp DEFAULT now(),
	"user_enabled" bool DEFAULT True,
	"last_login_date" timestamp,
	"first_login_date" timestamp,
	CONSTRAINT "users_pkey" PRIMARY KEY("uid"),
	CONSTRAINT "user_login" UNIQUE("login"),
	CONSTRAINT "user_email" UNIQUE("email")
)
WITH (
	OIDS = False
);


ALTER TABLE "users" OWNER TO "skwarki";GRANT ALL PRIVILEGES ON TABLE "users" TO "postgres";

GRANT SELECT, UPDATE, INSERT, DELETE ON TABLE "users" TO "skwarki";



CREATE TABLE "batches" (
	"bid" SERIAL NOT NULL,
	"uid" int4 NOT NULL,
	"batch_comment" text,
	"batch_opened" timestamp DEFAULT now(),
	"batch_closed" timestamp,
	PRIMARY KEY("bid")
)
WITH (
	OIDS = False
);


CREATE INDEX "batches_uid" ON "batches" (
	"uid"
);


ALTER TABLE "batches" OWNER TO "skwarki";GRANT ALL PRIVILEGES ON TABLE "batches" TO "postgres";

GRANT SELECT, UPDATE, INSERT, DELETE ON TABLE "batches" TO "skwarki";



CREATE TABLE "properties" (
	"iid" int4 NOT NULL,
	"property_name" text NOT NULL,
	"property_string" text,
	"property_number" float8,
	"property_type" "char",
	"property_visible" "char",
	"property_editable" "char",
	"property_global" bool DEFAULT true,
	PRIMARY KEY("iid","property_name")
)
WITH (
	OIDS = False
);


CREATE INDEX "properties_iid" ON "properties" (
	"iid"
);
GRANT ALL PRIVILEGES ON TABLE "properties" TO "postgres";

GRANT SELECT, UPDATE, INSERT, DELETE ON TABLE "properties" TO "skwarki";



CREATE TABLE "global_properties" (
	"property_name" text NOT NULL,
	"property_string" text NOT NULL,
	"property_description" text NOT NULL DEFAULT True,
	"property_type" "char" NOT NULL,
	PRIMARY KEY("property_name","property_string")
)
WITH (
	OIDS = False
);


CREATE INDEX "global_properties_name" ON "global_properties" (
	"property_name"
);
GRANT ALL PRIVILEGES ON TABLE "global_properties" TO "postgres";

GRANT SELECT, UPDATE, INSERT, DELETE ON TABLE "global_properties" TO "skwarki";



CREATE TABLE "groups" (
	"gid" SERIAL NOT NULL,
	"group_name" text,
	"group_administrator" int4,
	"group_description" text,
	PRIMARY KEY("gid"),
	CONSTRAINT "groups_name_administrator" UNIQUE("group_name","group_administrator")
)
WITH (
	OIDS = False
);


CREATE INDEX "groups_administrator" ON "groups" (
	"group_administrator"
);
GRANT ALL PRIVILEGES ON TABLE "groups" TO "postgres";

GRANT SELECT, UPDATE, INSERT, DELETE ON TABLE "groups" TO "skwarki";



CREATE TABLE "members" (
	"gid" int4 NOT NULL,
	"uid" int4 NOT NULL,
	"member_add" bool NOT NULL DEFAULT False,
	"member_del" bool NOT NULL DEFAULT False,
	PRIMARY KEY("gid","uid")
)
WITH (
	OIDS = False
);


CREATE INDEX "members_admins" ON "members" (
	"gid", 
	"member_add", 
	"member_del"
);


CREATE INDEX "members_uid" ON "members" (
	"uid"
);


CREATE INDEX "members_gid" ON "members" (
	"gid"
);
GRANT ALL PRIVILEGES ON TABLE "members" TO "postgres";

GRANT SELECT, UPDATE, INSERT, DELETE ON TABLE "members" TO "skwarki";



CREATE TABLE "image_privileges" (
	"iid" int4 NOT NULL,
	"gid" int4 NOT NULL,
	"image_edit" bool NOT NULL DEFAULT False,
	"image_annotate" bool NOT NULL DEFAULT False,
	"image_outline" bool NOT NULL DEFAULT False,
	PRIMARY KEY("iid","gid")
)
WITH (
	OIDS = False
);


CREATE INDEX "image_privileges_iid" ON "image_privileges" (
	"iid"
);


CREATE INDEX "image_privileges_gid" ON "image_privileges" (
	"gid"
);
GRANT ALL PRIVILEGES ON TABLE "image_privileges" TO "postgres";

GRANT SELECT, UPDATE, INSERT, DELETE ON TABLE "image_privileges" TO "skwarki";



CREATE TABLE "image_privileges_cache" (
	"iid" int4 NOT NULL,
	"gid" int4 NOT NULL,
	"uid" int4 NOT NULL,
	"image_edit" bool NOT NULL DEFAULT False,
	"image_annotate" bool NOT NULL DEFAULT False,
	"image_outline" bool NOT NULL DEFAULT False,
	PRIMARY KEY("iid","gid","uid")
)
WITH (
	OIDS = False
);


CREATE INDEX "image_privileges_cache_iid_uid" ON "image_privileges_cache" (
	"iid", 
	"uid"
);


CREATE INDEX "image_privileges_cache_iid_uid_privileges" ON "image_privileges_cache" (
	"iid", 
	"uid", 
	"image_edit", 
	"image_annotate"
);


CREATE INDEX "image_privileges_cache_iid" ON "image_privileges_cache" (
	"iid"
);


CREATE INDEX "image_privileges_cache_uid" ON "image_privileges_cache" (
	"uid"
);
GRANT ALL PRIVILEGES ON TABLE "image_privileges_cache" TO "postgres";

GRANT SELECT, UPDATE, INSERT, DELETE ON TABLE "image_privileges_cache" TO "skwarki";




ALTER TABLE "images" ADD CONSTRAINT "Ref_images_to_batches" FOREIGN KEY ("bid")
	REFERENCES "batches"("bid")
	MATCH SIMPLE
	ON DELETE NO ACTION
	ON UPDATE NO ACTION
	NOT DEFERRABLE;

ALTER TABLE "images" ADD CONSTRAINT "Ref_images_to_users" FOREIGN KEY ("uid")
	REFERENCES "users"("uid")
	MATCH SIMPLE
	ON DELETE NO ACTION
	ON UPDATE NO ACTION
	NOT DEFERRABLE;

ALTER TABLE "batches" ADD CONSTRAINT "Ref_batches_to_users" FOREIGN KEY ("uid")
	REFERENCES "users"("uid")
	MATCH SIMPLE
	ON DELETE NO ACTION
	ON UPDATE NO ACTION
	NOT DEFERRABLE;

ALTER TABLE "properties" ADD CONSTRAINT "Ref_properties_to_images" FOREIGN KEY ("iid")
	REFERENCES "images"("iid")
	MATCH SIMPLE
	ON DELETE NO ACTION
	ON UPDATE CASCADE
	NOT DEFERRABLE;

ALTER TABLE "groups" ADD CONSTRAINT "Ref_groups_to_users" FOREIGN KEY ("group_administrator")
	REFERENCES "users"("uid")
	MATCH SIMPLE
	ON DELETE NO ACTION
	ON UPDATE CASCADE
	NOT DEFERRABLE;

ALTER TABLE "members" ADD CONSTRAINT "Ref_members_to_users" FOREIGN KEY ("uid")
	REFERENCES "users"("uid")
	MATCH SIMPLE
	ON DELETE CASCADE
	ON UPDATE CASCADE
	NOT DEFERRABLE;

ALTER TABLE "members" ADD CONSTRAINT "Ref_members_to_groups" FOREIGN KEY ("gid")
	REFERENCES "groups"("gid")
	MATCH SIMPLE
	ON DELETE CASCADE
	ON UPDATE CASCADE
	NOT DEFERRABLE;

ALTER TABLE "image_privileges" ADD CONSTRAINT "Ref_image_privileges_to_images" FOREIGN KEY ("iid")
	REFERENCES "images"("iid")
	MATCH SIMPLE
	ON DELETE CASCADE
	ON UPDATE CASCADE
	NOT DEFERRABLE;

ALTER TABLE "image_privileges" ADD CONSTRAINT "Ref_image_privileges_to_groups" FOREIGN KEY ("gid")
	REFERENCES "groups"("gid")
	MATCH SIMPLE
	ON DELETE CASCADE
	ON UPDATE CASCADE
	NOT DEFERRABLE;

ALTER TABLE "image_privileges_cache" ADD CONSTRAINT "Ref_image_privileges_cache_to_members" FOREIGN KEY ("gid", "uid")
	REFERENCES "members"("gid", "uid")
	MATCH SIMPLE
	ON DELETE CASCADE
	ON UPDATE CASCADE
	NOT DEFERRABLE;

ALTER TABLE "image_privileges_cache" ADD CONSTRAINT "Ref_image_privileges_cache_to_image_privileges" FOREIGN KEY ("iid", "gid")
	REFERENCES "image_privileges"("iid", "gid")
	MATCH SIMPLE
	ON DELETE CASCADE
	ON UPDATE CASCADE
	NOT DEFERRABLE;


