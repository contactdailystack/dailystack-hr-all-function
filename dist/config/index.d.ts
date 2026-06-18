export declare const supabase: import("@supabase/supabase-js").SupabaseClient<any, "public", "public", any, any>;
export declare const supabaseAdmin: import("@supabase/supabase-js").SupabaseClient<any, "public", "public", any, any> | null;
export declare const config: {
    readonly line: {
        readonly channelAccessToken: string;
        readonly channelSecret: string;
        readonly liffId: string;
    };
    readonly geofence: {
        readonly maxAccuracy: 50;
        readonly defaultBranch: {
            readonly lat: 13.692087686713544;
            readonly lng: 100.5281857510635;
            readonly radius: 80;
        };
    };
    readonly server: {
        readonly port: number;
        readonly nodeEnv: string;
    };
};
export default config;
//# sourceMappingURL=index.d.ts.map