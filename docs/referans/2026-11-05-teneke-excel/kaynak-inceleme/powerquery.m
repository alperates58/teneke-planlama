section Section1;

shared AA_alper_planktenekee = let
    Kaynak = Sql.Databases("172.17.0.6"),
    MikroDesktop_LIDER26 = Kaynak{[Name="MikroDesktop_LIDER26"]}[Data],
    dbo_AA_alper_planktenekee = MikroDesktop_LIDER26{[Schema="dbo",Item="AA_alper_planktenekee"]}[Data]
in
    dbo_AA_alper_planktenekee;

shared AA_alper_tenekeihtiyaç5 = let
    Kaynak = Sql.Databases("172.17.0.6"),
    MikroDesktop_LIDER26 = Kaynak{[Name="MikroDesktop_LIDER26"]}[Data],
    dbo_AA_alper_tenekeihtiyaç5 = MikroDesktop_LIDER26{[Schema="dbo",Item="AA_alper_tenekeihtiyaç5"]}[Data]
in
    dbo_AA_alper_tenekeihtiyaç5;

shared #"AA_alper_tenekeihtiyaç5 (2)" = let
    Kaynak = Sql.Databases("172.17.0.6"),
    MikroDesktop_LIDER26 = Kaynak{[Name="MikroDesktop_LIDER26"]}[Data],
    dbo_AA_alper_tenekeihtiyaç5 = MikroDesktop_LIDER26{[Schema="dbo",Item="AA_alper_tenekeihtiyaç5"]}[Data]
in
    dbo_AA_alper_tenekeihtiyaç5;

shared AA_emre_plantenekee = let
    Kaynak = Sql.Databases("172.17.0.6"),
    MikroDesktop_LIDER26 = Kaynak{[Name="MikroDesktop_LIDER26"]}[Data],
    dbo_AA_emre_plantenekee = MikroDesktop_LIDER26{[Schema="dbo",Item="AA_emre_plantenekee"]}[Data]
in
    dbo_AA_emre_plantenekee;

shared #"AA_emre_plantenekee (2)" = let
    Kaynak = Sql.Databases("172.17.0.6"),
    MikroDesktop_LIDER26 = Kaynak{[Name="MikroDesktop_LIDER26"]}[Data],
    dbo_AA_emre_plantenekee = MikroDesktop_LIDER26{[Schema="dbo",Item="AA_emre_plantenekee"]}[Data]
in
    dbo_AA_emre_plantenekee;